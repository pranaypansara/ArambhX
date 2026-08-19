"""ML1 inference through the saved pipeline.

The trained pipeline (`ml1_prediction_pipeline.pkl`) is an sklearn `Pipeline`
containing ALL preprocessing (numeric SimpleImputer median + categorical
SimpleImputer most_frequent/OneHotEncoder) followed by an XGBClassifier, so no
additional preprocessing is needed here. `ml1_threshold.pkl` holds the binary
decision threshold (~0.5) trained/selected alongside the model.

The model is loaded once and reused for every prediction.
"""

from __future__ import annotations

import logging
from typing import Any

import joblib
import numpy as np
import pandas as pd

from ..config import PIPELINE_PATH, THRESHOLD_PATH
from ..schemas.prediction import ML1_CATEGORICAL_FEATURES, ML1_FEATURE_ORDER

logger = logging.getLogger(__name__)


class ModelLoadError(RuntimeError):
    """Raised when a required ML artifact is missing or unreadable."""


def _required_artifact_message() -> str:
    return (
        f"ML1 model artifacts are missing or unreadable. Required files:\n"
        f"  pipeline : {PIPELINE_PATH}\n"
        f"  threshold: {THRESHOLD_PATH}\n"
        f"Copy them (unmodified) from server/ml/source/ into app/models/. "
        f"See server/ml/service/README.md."
    )


class PredictionService:
    """Holds the loaded ML1 pipeline + threshold and runs inference."""

    def __init__(self) -> None:
        self._pipeline: Any | None = None
        self._threshold: float | None = None

    @property
    def is_loaded(self) -> bool:
        return self._pipeline is not None and self._threshold is not None

    def load(self) -> None:
        """Eager load (idempotent). Raises ModelLoadError on missing artifacts."""
        if self.is_loaded:
            return
        try:
            pipeline = joblib.load(PIPELINE_PATH)
            threshold = float(np.asarray(joblib.load(THRESHOLD_PATH), dtype=float))
        except (FileNotFoundError, OSError, ValueError, ModuleNotFoundError) as exc:
            raise ModelLoadError(_required_artifact_message()) from exc
        if not hasattr(pipeline, "predict_proba"):
            raise ModelLoadError(
                "Loaded ML1 artifact has no predict_proba(); expected an sklearn "
                "pipeline ending in a classifier."
            )
        self._pipeline = pipeline
        self._threshold = threshold
        logger.info("ML1 pipeline + threshold loaded (threshold=%s)", self._threshold)

    def model_info(self) -> dict[str, str]:
        self.load()
        pipeline = self._pipeline
        model = pipeline.steps[-1][1] if hasattr(pipeline, "steps") else pipeline
        return {
            "type": f"{type(pipeline).__module__}.{type(pipeline).__qualname__}",
            "model": f"{type(model).__module__}.{type(model).__qualname__}",
            "n_input_features": str(len(ML1_FEATURE_ORDER)),
        }

    def _construct_input(self, features: dict[str, Any]) -> pd.DataFrame:
        missing = [f for f in ML1_FEATURE_ORDER if f not in features]
        if missing:
            raise ValueError(f"Missing required features: {missing}")
        row = {
            name: features[name]
            for name in ML1_FEATURE_ORDER
        }
        return pd.DataFrame([row])[ML1_FEATURE_ORDER]

    def predict(self, features: dict[str, Any]) -> dict[str, Any]:
        """Run a single prediction. Returns the structured result dict."""
        self.load()  # lazy fallback if startup load failed

        df = self._construct_input(features)

        # Numeric columns may be null (pipeline imputes median); categorical
        # nulls are imputed to most_frequent; unknown categories all-zero.
        for name in df.columns:
            if name in ML1_CATEGORICAL_FEATURES:
                df[name] = df[name].astype("object")
            else:
                df[name] = pd.to_numeric(df[name], errors="coerce")

        prob_dropout = float(self._pipeline.predict_proba(df)[0, 1])
        threshold = float(self._threshold)

        prediction = 1 if prob_dropout >= threshold else 0

        # Risk bands preserved from the ML team's inference design (sih-model-m1.ipynb).
        if prob_dropout >= 0.70:
            risk_level = "HIGH"
        elif prob_dropout >= 0.40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "prediction": prediction,
            "prediction_label": "dropout" if prediction == 1 else "not_dropout",
            "risk_probability": round(prob_dropout, 6),
            "threshold": round(threshold, 6),
            "risk_level": risk_level,
            "model": type(self._pipeline.steps[-1][1]).__name__
            if hasattr(self._pipeline, "steps")
            else type(self._pipeline).__name__,
        }


prediction_service = PredictionService()

__all__ = ["prediction_service", "PredictionService", "ModelLoadError"]