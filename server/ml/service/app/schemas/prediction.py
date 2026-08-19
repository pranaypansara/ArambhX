"""Pydantic request/response schemas for the ML1 prediction endpoint.

The request schema mirrors the EXACT ML1 feature schema discovered from the
trained pipeline (`feature_names_in_`, 35 columns) and the Phase 3 Node.js
feature builder. The pipeline's own preprocessing (median imputation for
numeric, most-frequent + one-hot for categorical) lives inside the saved
pickle, so `null` values are accepted and imputed at inference time.
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, StrictFloat, StrictStr

# Numeric features must be real numbers (no string coercion); `null` is allowed
# because the saved pipeline imputes it. Categorical features must be strings
# or null; unknown categories are safely one-hot encoded to zeros
# (`handle_unknown='ignore'`).
Num = Optional[StrictFloat]
Cat = Optional[StrictStr]

# Exact column order declared by the trained pipeline via `feature_names_in_`.
ML1_FEATURE_ORDER: list[str] = [
    "code_module",
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "num_of_prev_attempts",
    "studied_credits",
    "disability",
    "assessments_attempted",
    "avg_assessment_score",
    "max_assessment_score",
    "min_assessment_score",
    "assessment_score_std",
    "avg_submission_date",
    "assessments_due",
    "assessment_completion_rate",
    "assessments_missed",
    "weighted_score",
    "total_assessment_weight",
    "weighted_performance",
    "avg_submission_delay",
    "max_submission_delay",
    "late_submission_count",
    "on_time_submission_count",
    "total_clicks",
    "active_days",
    "unique_sites",
    "avg_daily_clicks",
    "max_daily_clicks",
    "clicks_per_active_day",
    "sites_per_active_day",
    "date_registration",
    "registration_early",
    "registration_late",
]

# The 7 categorical features (one-hot encoded by the pipeline).
ML1_CATEGORICAL_FEATURES: frozenset[str] = frozenset(
    [
        "code_module",
        "gender",
        "region",
        "highest_education",
        "imd_band",
        "age_band",
        "disability",
    ]
)


class ML1FeaturesRequest(BaseModel):
    """The exact ML1-compatible feature payload from Phase 3.

    `extra='forbid'` rejects unknown/renamed fields so an incomplete or
    incorrectly-named payload fails validation instead of being silently mis-predicted.
    """

    model_config = ConfigDict(extra="forbid")

    code_module: Cat
    gender: Cat
    region: Cat
    highest_education: Cat
    imd_band: Cat
    age_band: Cat
    num_of_prev_attempts: Num
    studied_credits: Num
    disability: Cat
    assessments_attempted: Num
    avg_assessment_score: Num
    max_assessment_score: Num
    min_assessment_score: Num
    assessment_score_std: Num
    avg_submission_date: Num
    assessments_due: Num
    assessment_completion_rate: Num
    assessments_missed: Num
    weighted_score: Num
    total_assessment_weight: Num
    weighted_performance: Num
    avg_submission_delay: Num
    max_submission_delay: Num
    late_submission_count: Num
    on_time_submission_count: Num
    total_clicks: Num
    active_days: Num
    unique_sites: Num
    avg_daily_clicks: Num
    max_daily_clicks: Num
    clicks_per_active_day: Num
    sites_per_active_day: Num
    date_registration: Num
    registration_early: Num
    registration_late: Num


class PredictionResponse(BaseModel):
    """Structured prediction result.

    Consistent with the trained ML design (XGBClassifier, class 1 = dropout):
      - `prediction`: 1 = dropout, 0 = not dropout (binary, threshold-applied)
      - `risk_probability`: the model's P(class 1) for this feature payload
      - `threshold`: the binary decision threshold from ml1_threshold.pkl
      - `risk_level`: LOW / MEDIUM / HIGH bands preserved from the ML design
    """

    prediction: int
    prediction_label: str
    risk_probability: float
    threshold: float
    risk_level: str
    model: str