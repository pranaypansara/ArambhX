"""ML2 risk-intelligence analysis for a single student.

ML2 (see `server/ml/source/run_ml2.py`) is the "Risk Intelligence & Adaptive
Intervention" layer layered on top of ML1. For a student it produces:

  - risk trend metrics (velocity, acceleration, volatility, trajectory) computed
    over the student's risk snapshots,
  - a smart alert (level + type tags) from the SmartAlertEngine,
  - ranked intervention recommendations from the InterventionEngine catalog.

The engines' logic (weights, thresholds, catalog, profile rules) is ported
verbatim from run_ml2.py into `ml2_engines.py` and, when present, the pickled
engine instances/serialized catalog are loaded from `app/models/`. Nothing
here re-implements ML1: the current risk probability is obtained by running the
already-tracked ML1 pipeline (prediction_service) on the current features.

Data availability notes (honest, non-invented):
  - current features   -> from the request (backend Phase 3 builder)
  - risk history       -> from the request (backend `predictions` table)
  - per-snapshot feature trends (needed for behavior-deviation / deterioration
    analysis) are NOT persisted in the backend database, so those alert
    components are left at the ML2 engine defaults (0) — exactly what the
    engines produce when the fields are absent.
"""

from __future__ import annotations

import logging
from typing import Any

from ..config import ML2_ALERT_ENGINE_PATH, ML2_CATALOG_PATH, ML2_INTERVENTION_ENGINE_PATH
from ..schemas.ml2 import (
    ML2Alert,
    ML2AnalysisRequest,
    ML2AnalysisResponse,
    ML2Recommendation,
    ML2RiskTrend,
)
from .ml2_engines import (
    INTERVENTION_CATALOG,
    InterventionEngine,
    SmartAlertEngine,
    compute_acceleration,
    compute_max_velocity,
    compute_risk_volatility,
    compute_velocity,
    load_pickled_engine,
)
from .prediction_service import ModelLoadError, prediction_service

logger = logging.getLogger(__name__)


class ML2LoadError(RuntimeError):
    """Raised when an ML2 artifact is missing or unreadable."""


def _required_artifact_message() -> str:
    exists = {
        "alert engine": ML2_ALERT_ENGINE_PATH.exists(),
        "intervention engine": ML2_INTERVENTION_ENGINE_PATH.exists(),
        "catalog": ML2_CATALOG_PATH.exists(),
    }
    missing = [name for name, ok in exists.items() if not ok]
    return (
        "ML2 artifacts are missing or unreadable. Missing: "
        f"{', '.join(missing) or 'none (unpickle failed)'}. Required files "
        f"(in app/models/):\n  {ML2_ALERT_ENGINE_PATH.name}\n"
        f"  {ML2_INTERVENTION_ENGINE_PATH.name}\n  {ML2_CATALOG_PATH.name}"
    )


class ML2Service:
    """Loads ML2 engines once and runs a student risk analysis."""

    def __init__(self) -> None:
        self._alert_engine: SmartAlertEngine | None = None
        self._intervention_engine: InterventionEngine | None = None
        self._catalog: dict[str, dict[str, Any]] | None = None

    @property
    def is_loaded(self) -> bool:
        return (
            self._alert_engine is not None
            and self._intervention_engine is not None
            and self._catalog is not None
        )

    def load(self) -> None:
        """Eager load of ML2 artifacts (idempotent). Raises ML2LoadError."""
        if self.is_loaded:
            return
        try:
            catalog = load_pickled_engine(ML2_CATALOG_PATH)
            alert_engine = load_pickled_engine(ML2_ALERT_ENGINE_PATH)
            intervention_engine = load_pickled_engine(ML2_INTERVENTION_ENGINE_PATH)
        except (FileNotFoundError, OSError, ValueError, ModuleNotFoundError, TypeError) as exc:
            raise ML2LoadError(_required_artifact_message()) from exc

        if not isinstance(catalog, dict):
            raise ML2LoadError("Loaded ML2 catalog artifact is not a dict.")
        if not isinstance(alert_engine, SmartAlertEngine):
            raise ML2LoadError("Loaded ML2 alert artifact is not a SmartAlertEngine.")
        if not isinstance(intervention_engine, InterventionEngine):
            raise ML2LoadError("Loaded ML2 intervention artifact is not an InterventionEngine.")

        self._catalog = catalog
        self._alert_engine = alert_engine
        self._intervention_engine = intervention_engine
        logger.info(
            "ML2 engines loaded (catalog=%d interventions)",
            len(catalog),
        )

    def _build_trend(
        self, risks: list[float], latest_risk: float
    ) -> dict[str, Any]:
        """Trend metrics mirroring run_ml2.py section 5."""
        velocity = compute_velocity(risks)
        acceleration = compute_acceleration(risks)
        max_velocity = compute_max_velocity(risks)
        volatility = compute_risk_volatility(risks)

        risk_trend = (
            "INCREASING"
            if velocity > 0.02
            else "DECREASING"
            if velocity < -0.02
            else "STABLE"
        )
        if acceleration > 0.01 and velocity > 0:
            trajectory = "ESCALATING"
        elif acceleration < -0.01 and velocity < 0:
            trajectory = "IMPROVING"
        elif volatility > 0.1:
            trajectory = "VOLATILE"
        else:
            trajectory = "STABLE"

        return {
            "num_snapshots": len(risks),
            "first_risk": risks[0] if risks else latest_risk,
            "latest_risk": latest_risk,
            "risk_velocity": round(velocity, 6),
            "risk_acceleration": round(acceleration, 6),
            "risk_max_velocity": round(max_velocity, 6),
            "risk_volatility": round(volatility, 6),
            "risk_trend": risk_trend,
            "trajectory_pattern": trajectory,
        }

    def analyze(self, request: ML2AnalysisRequest) -> ML2AnalysisResponse:
        """Run the ML2 risk analysis for one student."""
        self.load()  # lazy fallback if startup load failed

        # ML1 always yields the CURRENT risk for the current features; the
        # trend sequence is the stored snapshots + this fresh current value.
        try:
            ml1_result = prediction_service.predict(request.features.model_dump())
        except ModelLoadError as exc:
            raise ML2LoadError("ML2 depends on ML1: " + str(exc)) from exc

        current_risk = ml1_result["risk_probability"]

        history_risks = [p.risk_probability for p in request.risk_history]
        risks = history_risks + [current_risk]

        trend = self._build_trend(risks, current_risk)

        # Build the "row" the alert/intervention engines consume. It is the
        # current feature payload plus the computed risk metrics. Signals that
        # require historical feature snapshots (behavior deviation, deterioration)
        # are left at the engine defaults because that data is not persisted.
        row: dict[str, Any] = dict(request.features.model_dump())
        row.update(
            {
                "risk_probability": current_risk,
                "risk_velocity": trend["risk_velocity"],
                "risk_acceleration": trend["risk_acceleration"],
                "risk_max_velocity": trend["risk_max_velocity"],
                "risk_volatility": trend["risk_volatility"],
                "risk_trend": trend["risk_trend"],
                "trajectory_pattern": trend["trajectory_pattern"],
                "first_risk": trend["first_risk"],
                "num_snapshots": trend["num_snapshots"],
                # Not derivable from stored data -> engine defaults (0/false).
                "behavior_deviation_score": 0.0,
                "deterioration_score": 0.0,
                "engagement_trend": 0.0,
                "deterioration_count": 0,
                "academic_deteriorating": 0,
                "engagement_deteriorating": 0,
            }
        )

        alert_data = self._alert_engine.compute(row)  # type: ignore[union-attr]
        recommendations = self._intervention_engine.recommend(row, top_n=3)  # type: ignore[union-attr]

        risk_category = (
            "HIGH"
            if current_risk >= 0.70
            else "MEDIUM"
            if current_risk >= 0.40
            else "LOW"
        )

        return ML2AnalysisResponse(
            student_id=request.student_id,
            risk_probability=round(current_risk, 6),
            risk_category=risk_category,
            risk_trend=ML2RiskTrend(**trend),
            alert=ML2Alert(**alert_data),
            recommendations=[
                ML2Recommendation(**rec) for rec in recommendations
            ],
            risk_history=request.risk_history,
        )


ml2_service = ML2Service()

__all__ = ["ml2_service", "ML2Service", "ML2LoadError"]