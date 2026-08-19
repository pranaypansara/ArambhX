# ML1 Dropout Prediction Service (FastAPI)

Standalone Python inference service for **ML1** — the trained dropout-prediction
model. It loads the saved model artifact, validates the exact ML1-compatible
feature payload, and returns a structured dropout-risk result.

This phase (**Phase 5**) only builds and prepares the service. Node.js
integration happens in **Phase 6** — the Node backend does NOT call this service yet.

## What it does

```
Neon PostgreSQL ──► Node.js Feature Builder ──► ML1 feature payload (35 fields)
                                                       │
                                                       ▼   (Phase 6 connects this)
                             FastAPI ML Service: validate ─► predict_proba ─► threshold ─► result
```

- Loads the trained sklearn/XGBoost pipeline **once** at startup.
- `/predict` accepts the exact Phase 3 feature payload (35 fields) and returns:
  - `prediction` (0/1 binary, threshold-applied)
  - `risk_probability` (model probability of class 1 = *dropout*)
  - `threshold` (decision threshold from `ml1_threshold.pkl`)
  - `risk_level` (LOW / MEDIUM / HIGH bands from the ML design)

## Model artifacts

The service needs exactly two files (copied **unmodified** from `server/ml/source/`):

| File                             | Size   | Purpose                                         |
|----------------------------------|--------|-------------------------------------------------|
| `ml1_prediction_pipeline.pkl`    | ~1.2 MB| Trained sklearn `Pipeline` (preprocessor + XGBClassifier) |
| `ml1_threshold.pkl`              | ~0.1 KB| Binary decision threshold (~0.5)                |

They are committed inside `app/models/` so the service runs out of the box. To
refresh them from source:

```powershell
# from server/ml/service
Copy-Item ..\source\ml1_prediction_pipeline.pkl .\app\models\ml1_prediction_pipeline.pkl
Copy-Item ..\source\ml1_threshold.pkl           .\app\models\ml1_threshold.pkl
```

> **Deployment note:** `server/ml/source/` is **not** in Git (contains ~443 MB
> `studentVle.csv` and other artifacts). Only the two small files above are
> committed to `app/models/`. When deploying to a fresh environment, ensure the
> two `.pkl` files are present under `app/models/` (or point `ML1_PIPELINE_PATH`
> / `ML1_THRESHOLD_PATH` at them). The service fails clearly with a 503 if they
> are missing.

## Python version

Python **3.11+** recommended.

## Setup (Windows PowerShell)

```powershell
cd server/ml/service

# 1. Create a virtual environment
python -m venv .venv

# 2. Activate it
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt
```

> `scikit-learn` is pinned to **1.7.2**. This is **required**, not optional: the
> model was serialized with sklearn 1.7.2, and newer sklearn versions fail to
> run its `transform` step (e.g. `AttributeError: 'SimpleImputer' object has no
> attribute '_fill_dtype'`). Only use the pinned version to obtain identical
> imputation/encoding behavior. Other requirements (fastapi, uvicorn, pydantic,
> numpy, pandas, xgboost, joblib) are unpinned within a compatible major range.

## Configuration

Optional environment variables (copy `.env.example` to `.env` if desired):

| Variable             | Default                                    |
|----------------------|--------------------------------------------|
| `ML_MODELS_DIR`      | `./app/models`                             |
| `ML1_PIPELINE_PATH`  | `<ML_MODELS_DIR>/ml1_prediction_pipeline.pkl` |
| `ML1_THRESHOLD_PATH` | `<ML_MODELS_DIR>/ml1_threshold.pkl`        |
| `APP_ENV`            | `development`                              |
| `HOST` / `PORT`      | `0.0.0.0` / `8000`                         |

Paths are resolved relative to the service directory, not the CWD. No database
credentials are needed — this service does not connect to Neon.

## Run

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
# or, for development with auto-reload:
#   uvicorn main:app --reload
# or simply:
#   python main.py
```

## Health check

```
GET /health
```

```json
{
  "status": "healthy",
  "model_loaded": true,
  "environment": "development"
}
```

`model_loaded: false` (and `/predict` returning 503) means the artifacts are
missing or unreadable — fix the model files and restart.

## Predict

```
POST /predict
Content-Type: application/json
```

Body = the exact ML1 feature payload from the Phase 3 builder
(`GET /api/students/:id/ml-features`). All 35 fields are required; `null` is
acceptable for any field (the pipeline imputes it). Example:

```json
{
  "code_module": "CCC",
  "gender": "M",
  "region": "South East Region",
  "highest_education": "A Level or Equivalent",
  "imd_band": "40-50%",
  "age_band": "0-35",
  "num_of_prev_attempts": 0,
  "studied_credits": 60,
  "disability": "N",
  "assessments_attempted": 5,
  "avg_assessment_score": 87,
  "max_assessment_score": 92,
  "min_assessment_score": 80,
  "assessment_score_std": 4.69,
  "avg_submission_date": null,
  "assessments_due": 5,
  "assessment_completion_rate": 1.0,
  "assessments_missed": 0,
  "weighted_score": 84.0,
  "total_assessment_weight": 100.0,
  "weighted_performance": 0.84,
  "avg_submission_delay": -2.2,
  "max_submission_delay": -1,
  "late_submission_count": 0,
  "on_time_submission_count": 5,
  "total_clicks": 1840,
  "active_days": 30,
  "unique_sites": 4,
  "avg_daily_clicks": 61.33,
  "max_daily_clicks": 82,
  "clicks_per_active_day": 61.33,
  "sites_per_active_day": 0.13,
  "date_registration": null,
  "registration_early": null,
  "registration_late": null
}
```

Response:

```json
{
  "prediction": 0,
  "prediction_label": "not_dropout",
  "risk_probability": 0.013243,
  "threshold": 0.5,
  "risk_level": "LOW",
  "model": "XGBClassifier"
}
```

Validation: the request schema enforces exactly the 35 ML1 field names
(`extra = forbid`), rejects unknown/renamed fields, requires numeric fields to
be numbers or `null` (no string coercion), and categorical fields to be strings
or `null`. Validation errors return HTTP `422` with a description. Unknown
categorical labels are safe (the encoder uses `handle_unknown='ignore'`).

## Error handling

- `422` — invalid feature payload (schema validation or type errors)
- `503` — model artifacts missing/unreadable; service not ready
- `500` — unexpected inference failure (no tracebacks leaked to clients)

## API endpoints

| Method | Path      | Description                                   |
|--------|-----------|-----------------------------------------------|
| GET    | `/health` | Service + model availability                  |
| POST   | `/predict`| Run ML1 inference on a feature payload        |

## Phase 6 (planned, not implemented here)

Node.js ↔ Python integration: the Node backend will forward the Phase 3 feature
payload to this FastAPI service and surface the result through the existing API.

## Files

```
service/
├── main.py                      # FastAPI app + routes
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
└── app/
    ├── __init__.py
    ├── config.py                # env-backed paths/configuration
    ├── schemas/
    │   ├── __init__.py
    │   └── prediction.py        # Pydantic request/response + exact 35-field schema
    ├── services/
    │   ├── __init__.py
    │   └── prediction_service.py# model load-once + inference logic
    └── models/                  # ML1 artifacts (committed, small)
        ├── ml1_prediction_pipeline.pkl
        └── ml1_threshold.pkl
```