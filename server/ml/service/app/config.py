"""Configuration for the standalone ML1 prediction service.

Paths resolve relative to this service directory so the service works
regardless of the current working directory. Every value can be overridden
through environment variables (see .env.example).
"""

import os
from pathlib import Path

# service/  (parent of app/)
BASE_DIR: Path = Path(__file__).resolve().parent.parent

# Where the ML1 inference artifacts live. The exact files required are
#   - ml1_prediction_pipeline.pkl
#   - ml1_threshold.pkl
# placed here (copied unmodified from server/ml/source/).
MODELS_DIR: Path = Path(os.environ.get("ML_MODELS_DIR", str(BASE_DIR / "app" / "models")))

PIPELINE_PATH: Path = Path(
    os.environ.get("ML1_PIPELINE_PATH", str(MODELS_DIR / "ml1_prediction_pipeline.pkl"))
)

THRESHOLD_PATH: Path = Path(
    os.environ.get("ML1_THRESHOLD_PATH", str(MODELS_DIR / "ml1_threshold.pkl"))
)

# development | production. Currently informational only.
APP_ENV: str = os.environ.get("APP_ENV", "development")

# Host/port for `uvicorn main:app` launched via `python main.py`.
HOST: str = os.environ.get("HOST", "0.0.0.0")
PORT: int = int(os.environ.get("PORT", "8000"))