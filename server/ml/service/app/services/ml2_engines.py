"""ML2 risk-intelligence engines, ported verbatim from the ML team's pipeline.

The ML-2 module (`server/ml/source/run_ml2.py`, section "RISK HISTORY & TREND
ANALYSIS" through "INTERVENTION RECOMMENDATION ENGINE") defines a set of
rule-based engines that turn ML1 risk probabilities plus feature snapshots into
actionable intelligence:

  - risk_velocity / risk_acceleration / risk_volatility over snapshots
  - SmartAlertEngine  -> alert_score / alert_level / alert_types
  - InterventionEngine -> ranked intervention recommendations from a catalog

The pickled artifacts (ml2_smart_alert_engine.pkl, ml2_intervention_engine.pkl,
ml2_intervention_catalog.pkl) are instances/state of these exact classes. This
module reproduces the same class definitions so those pickles can be unpickled
with a `__main__` redirect (the original script ran as a top-level module), and
so fresh engine instances have exactly the same behavior when the pickles are
absent.

Nothing here is invented: the weights, thresholds and catalog below are copied
unchanged from run_ml2.py.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import joblib
import numpy as np

logger = logging.getLogger(__name__)


def safe_float(val: Any, default: float = 0.0) -> float:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def compute_velocity(risks: list[float]) -> float:
    if len(risks) < 2:
        return 0.0
    return float(np.mean(np.diff(np.asarray(risks, dtype=float))))


def compute_acceleration(risks: list[float]) -> float:
    if len(risks) < 3:
        return 0.0
    return float(np.mean(np.diff(np.diff(np.asarray(risks, dtype=float)))))


def compute_max_velocity(risks: list[float]) -> float:
    if len(risks) < 2:
        return 0.0
    return float(np.max(np.diff(np.asarray(risks, dtype=float))))


def compute_risk_volatility(risks: list[float]) -> float:
    if len(risks) < 2:
        return 0.0
    return float(np.std(np.diff(np.asarray(risks, dtype=float))))


# Intervention catalog copied verbatim from run_ml2.py (section 10).
INTERVENTION_CATALOG: dict[str, dict[str, Any]] = {
    "ACADEMIC_TUTORING": {"name": "Academic Tutoring", "triggers": ["ACADEMIC_DECLINE", "HIGH_RISK"],
        "patterns": ["IMPROVING", "STABLE", "VOLATILE"], "priority": 1,
        "factors": {"assessment_score_low": 0.3, "completion_rate_low": 0.2, "academic_deteriorating": 0.3, "weighted_performance_low": 0.2}},
    "MENTOR_MEETING": {"name": "Mentor Meeting", "triggers": ["RAPID_INCREASE", "ESCALATING", "MULTI_FACTOR"],
        "patterns": ["ESCALATING", "VOLATILE"], "priority": 2,
        "factors": {"risk_velocity_high": 0.3, "multi_factor_deterioration": 0.3, "behavior_deviation": 0.2, "trajectory_escalating": 0.2}},
    "ATTENDANCE_PLAN": {"name": "Attendance Plan", "triggers": ["ENGAGEMENT_DECLINE", "BEHAVIOR_DEVIATION"],
        "patterns": ["STABLE", "IMPROVING", "VOLATILE"], "priority": 3,
        "factors": {"low_engagement": 0.3, "high_absence": 0.3, "vle_activity_low": 0.2, "late_submissions": 0.2}},
    "PEER_SUPPORT": {"name": "Peer Support", "triggers": ["BEHAVIOR_DEVIATION", "ENGAGEMENT_DECLINE"],
        "patterns": ["STABLE", "VOLATILE"], "priority": 4,
        "factors": {"social_isolation": 0.2, "low_engagement": 0.2, "early_stage_risk": 0.3, "improving_trajectory": 0.3}},
    "COUNSELING": {"name": "Counseling", "triggers": ["HIGH_RISK", "CRITICAL", "MULTI_FACTOR"],
        "patterns": ["ESCALATING", "VOLATILE"], "priority": 2,
        "factors": {"persistent_high_risk": 0.3, "academic_stress": 0.3, "intervention_history": 0.2, "financial_stress_indicator": 0.2}},
    "FINANCIAL_SUPPORT": {"name": "Financial Support", "triggers": ["HIGH_RISK", "MULTI_FACTOR"],
        "patterns": ["STABLE", "IMPROVING"], "priority": 3,
        "factors": {"imd_band_low": 0.4, "financial_stress_indicator": 0.3, "late_registration": 0.15, "multiple_attempts": 0.15}},
    "ACADEMIC_RECOVERY": {"name": "Academic Recovery", "triggers": ["HIGH_RISK", "ESCALATING", "MULTI_FACTOR"],
        "patterns": ["ESCALATING", "VOLATILE"], "priority": 1,
        "factors": {"multiple_backlogs": 0.3, "low_completion_rate": 0.3, "recent_enrollment": 0.2, "previous_attempts": 0.2}},
}


class SmartAlertEngine:
    def __init__(self) -> None:
        self.weights = {
            "risk_probability": 0.30,
            "risk_velocity": 0.20,
            "risk_acceleration": 0.10,
            "behavior_deviation": 0.15,
            "academic_deterioration": 0.10,
            "engagement_deterioration": 0.10,
            "deterioration_breadth": 0.05,
        }

    def compute(self, row: dict[str, Any]) -> dict[str, Any]:
        rp = safe_float(row.get("risk_probability", 0))
        rv = safe_float(row.get("risk_velocity", 0))
        ra = safe_float(row.get("risk_acceleration", 0))
        bd = safe_float(row.get("behavior_deviation_score", 0))
        ds = safe_float(row.get("deterioration_score", 0))
        et = safe_float(row.get("engagement_trend", 0))
        dc = safe_float(row.get("deterioration_count", 0))

        scores = {
            "risk_probability": float(np.clip(rp, 0, 1)),
            "risk_velocity": float(np.clip((rv + 0.5) / 1.0, 0, 1)),
            "risk_acceleration": float(np.clip((ra + 0.2) / 0.4, 0, 1)),
            "behavior_deviation": float(np.clip(bd, 0, 1)),
            "academic_deterioration": ds,
            "engagement_deterioration": 0.5 + (0.5 if et < 0 else -0.5),
            "deterioration_breadth": dc / 5.0,
        }
        alert_score = sum(self.weights[k] * scores[k] for k in self.weights)

        if alert_score >= 0.70:
            level = "CRITICAL"
        elif alert_score >= 0.50:
            level = "HIGH"
        elif alert_score >= 0.30:
            level = "MEDIUM"
        elif alert_score >= 0.15:
            level = "LOW"
        else:
            level = "NORMAL"

        types: list[str] = []
        if rp >= 0.70:
            types.append("HIGH_RISK")
        if rv > 0.05:
            types.append("RAPID_INCREASE")
        if ra > 0.02:
            types.append("ESCALATING")
        if dc >= 3:
            types.append("MULTI_FACTOR")
        if bd > 0.3:
            types.append("BEHAVIOR_DEVIATION")
        if safe_float(row.get("academic_deteriorating", 0)) == 1:
            types.append("ACADEMIC_DECLINE")
        if safe_float(row.get("engagement_deteriorating", 0)) == 1:
            types.append("ENGAGEMENT_DECLINE")
        if not types:
            types.append("STANDARD")

        return {
            "alert_score": round(float(alert_score), 4),
            "alert_level": level,
            "alert_types": types,
        }


class InterventionEngine:
    def __init__(self, catalog: dict[str, dict[str, Any]]) -> None:
        self.catalog = catalog

    def _profile(self, d: dict[str, Any]) -> dict[str, bool]:
        rp = safe_float(d.get("risk_probability", 0))
        imd = str(d.get("imd_band", ""))
        return {
            "high_risk": rp >= 0.70,
            "persistent_high_risk": rp >= 0.50 and safe_float(d.get("first_risk", 0)) >= 0.50,
            "assessment_score_low": safe_float(d.get("avg_assessment_score", 50)) < 40,
            "completion_rate_low": safe_float(d.get("assessment_completion_rate", 1)) < 0.5,
            "academic_deteriorating": safe_float(d.get("academic_deteriorating", 0)) == 1,
            "weighted_performance_low": safe_float(d.get("weighted_performance", 50)) < 40,
            "multiple_backlogs": safe_float(d.get("num_of_prev_attempts", 0)) > 0,
            "low_completion_rate": safe_float(d.get("assessment_completion_rate", 1)) < 0.6,
            "recent_enrollment": safe_float(d.get("date_registration", 0)) > 0,
            "previous_attempts": safe_float(d.get("num_of_prev_attempts", 0)) > 1,
            "low_engagement": safe_float(d.get("total_clicks", 100)) < 30,
            "vle_activity_low": safe_float(d.get("active_days", 10)) < 3,
            "high_absence": safe_float(d.get("assessment_completion_rate", 1)) < 0.4,
            "late_submissions": safe_float(d.get("late_submission_count", 0)) > 2,
            "social_isolation": safe_float(d.get("unique_sites", 10)) < 3,
            "early_stage_risk": 0.3 <= rp < 0.5,
            "improving_trajectory": d.get("trajectory_pattern") == "IMPROVING",
            "behavior_deviation": safe_float(d.get("behavior_deviation_score", 0)) > 0.3,
            "multi_factor_deterioration": safe_float(d.get("deterioration_count", 0)) >= 3,
            "risk_velocity_high": safe_float(d.get("risk_velocity", 0)) > 0.05,
            "trajectory_escalating": d.get("trajectory_pattern") == "ESCALATING",
            "imd_band_low": imd in ["10-20", "20-30", "0-10%"],
            "financial_stress_indicator": imd in ["10-20", "20-30", "0-10%"] and safe_float(d.get("assessment_completion_rate", 1)) < 0.4,
            "late_registration": safe_float(d.get("registration_late", 0)) == 1,
            "CRITICAL": rp >= 0.80,
            "HIGH_RISK": rp >= 0.70,
            "RAPID_INCREASE": safe_float(d.get("risk_velocity", 0)) > 0.08,
            "ESCALATING": safe_float(d.get("risk_acceleration", 0)) > 0.02,
            "MULTI_FACTOR": safe_float(d.get("deterioration_count", 0)) >= 3,
            "ENGAGEMENT_DECLINE": safe_float(d.get("engagement_deteriorating", 0)) == 1,
            "ACADEMIC_DECLINE": safe_float(d.get("academic_deteriorating", 0)) == 1,
            "BEHAVIOR_DEVIATION": safe_float(d.get("behavior_deviation_score", 0)) > 0.3,
        }

    def _suitability(self, code: str, info: dict[str, Any], profile: dict[str, bool]) -> float:
        s = sum(w for k, w in info["factors"].items() if profile.get(k, False))
        trig_bonus = sum(0.15 for t in info["triggers"] if profile.get(t, False))
        return min(s + trig_bonus, 1.0)

    def recommend(self, data: dict[str, Any], top_n: int = 3) -> list[dict[str, Any]]:
        d = data.to_dict() if hasattr(data, "to_dict") else data
        profile = self._profile(d)
        rp = safe_float(d.get("risk_probability", 0))
        recs: list[dict[str, Any]] = []
        for code, info in self.catalog.items():
            s = self._suitability(code, info, profile)
            if s > 0.05:
                intensity = "HIGH" if (s >= 0.6 or rp >= 0.80) else ("MEDIUM" if s >= 0.35 or rp >= 0.55 else "LOW")
                recs.append({
                    "intervention_code": code,
                    "intervention_name": info["name"],
                    "suitability_score": round(s, 4),
                    "intensity": intensity,
                    "matched_triggers": [t for t in info["triggers"] if profile.get(t, False)],
                })
        recs.sort(key=lambda x: x["suitability_score"], reverse=True)
        return recs[:top_n]


def load_pickled_engine(path: str) -> Any:
    """Load a pickled ML2 engine, redirecting `__main__` to this module.

    The original artifacts were pickled by a script executed as `__main__`, so
    unpickling resolves classes/functions against this module's definitions.
    """
    engine_module = sys.modules[__name__]
    original_main = sys.modules.get("__main__")
    sys.modules["__main__"] = engine_module
    try:
        return joblib.load(path)
    finally:
        if original_main is not None:
            sys.modules["__main__"] = original_main
        else:
            sys.modules.pop("__main__", None)


__all__ = [
    "safe_float",
    "compute_velocity",
    "compute_acceleration",
    "compute_max_velocity",
    "compute_risk_volatility",
    "INTERVENTION_CATALOG",
    "SmartAlertEngine",
    "InterventionEngine",
    "load_pickled_engine",
]