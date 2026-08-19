"""Pydantic request/response schemas for the ML2 risk-analysis endpoint.

ML2 (from the ML team's `run_ml2.py`) turns a student's ML1 risk probability
plus its risk history over time into actionable intelligence: risk trend
metrics, a smart alert level/type, and ranked intervention recommendations.

The live integration reuses the EXACT ML1 feature payload (`ML1FeaturesRequest`)
because the intervention engine profiles a student from those very features.
The risk history passed in comes from the backend's stored `predictions` table,
which is the same "risk snapshots" data ML2 expects across presentations.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .prediction import ML1FeaturesRequest


class ML2RiskHistoryPoint(BaseModel):
    """One stored ML1 prediction used as a risk snapshot for trend analysis."""

    risk_probability: float = Field(ge=0.0, le=1.0)
    predicted_at: Optional[datetime] = None


class ML2AnalysisRequest(BaseModel):
    """Input for a single-student ML2 risk analysis.

    - `student_id`: backend student id (echoed back / used for lookups).
    - `features`: the exact current ML1 feature payload (Phase 3 builder).
    - `risk_history`: stored ML1 predictions, oldest first, so trends can be
      computed over the student's risk trajectory.
    """

    model_config = ConfigDict(extra="forbid")

    student_id: int = Field(gt=0)
    features: ML1FeaturesRequest
    risk_history: list[ML2RiskHistoryPoint] = Field(default_factory=list)


class ML2RiskTrend(BaseModel):
    """Trend metrics computed from the risk snapshot sequence (run_ml2.py sec. 5)."""

    num_snapshots: int
    first_risk: float
    latest_risk: float
    risk_velocity: float
    risk_acceleration: float
    risk_max_velocity: float
    risk_volatility: float
    risk_trend: str  # INCREASING | DECREASING | STABLE
    trajectory_pattern: str  # ESCALATING | IMPROVING | VOLATILE | STABLE


class ML2Alert(BaseModel):
    """Smart-alert engine output (run_ml2.py sec. 8)."""

    alert_score: float
    alert_level: str  # NORMAL | LOW | MEDIUM | HIGH | CRITICAL
    alert_types: list[str]


class ML2Recommendation(BaseModel):
    """Intervention catalog match (run_ml2.py sec. 10)."""

    intervention_code: str
    intervention_name: str
    suitability_score: float
    intensity: str  # LOW | MEDIUM | HIGH
    matched_triggers: list[str]


class ML2AnalysisResponse(BaseModel):
    """Structured ML2 risk intelligence for one student."""

    student_id: int
    risk_probability: float
    risk_category: str  # LOW | MEDIUM | HIGH
    risk_trend: ML2RiskTrend
    alert: ML2Alert
    recommendations: list[ML2Recommendation]
    risk_history: list[ML2RiskHistoryPoint]

    model_config = ConfigDict(extra="forbid")


__all__ = [
    "ML2AnalysisRequest",
    "ML2AnalysisResponse",
    "ML2RiskHistoryPoint",
    "ML2RiskTrend",
    "ML2Alert",
    "ML2Recommendation",
]