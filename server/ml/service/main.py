"""FastAPI entrypoint for the standalone ML prediction service.

Run:      uvicorn main:app --reload
Or:       python main.py

Endpoints:
  GET  /health      - service + model availability (ML1 + ML2)
  POST /predict     - ML1 inference on a Phase 3 feature payload
  POST /ml2/analyze - ML2 risk intelligence for a student
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.services.prediction_service import (
    ModelLoadError,
    prediction_service,
)
from app.services.ml2_service import (
    ML2LoadError,
    ml2_service,
)
from app.schemas.prediction import ML1FeaturesRequest, PredictionResponse
from app.schemas.ml2 import ML2AnalysisRequest, ML2AnalysisResponse
from app.config import APP_ENV, HOST, PORT

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ml.service")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Eager model load at startup. Missing/corrupt artifacts must NOT crash the
    # process — /health reflects availability and the endpoints return 503.
    for label, loader in (
        ("ML1", prediction_service.load),
        ("ML2", ml2_service.load),
    ):
        try:
            loader()
        except (ModelLoadError, ML2LoadError) as exc:
            logger.error("Startup %s model load failed: %s", label, exc)
    yield


app = FastAPI(
    title="ML Dropout Prediction Service",
    description="Standalone FastAPI service hosting ML1 (dropout-risk inference) "
    "and ML2 (risk intelligence & adaptive intervention).",
    version="0.2.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, object]:
    return {
        "status": "healthy",
        "model_loaded": prediction_service.is_loaded,
        "ml2_loaded": ml2_service.is_loaded,
        "environment": APP_ENV,
    }


@app.post("/predict", response_model=PredictionResponse, tags=["inference"])
async def predict(request: ML1FeaturesRequest) -> PredictionResponse:
    if not prediction_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="ML model is not available. Verify the model artifacts are in place and restart the service.",
        )
    try:
        payload = request.model_dump()
        result = prediction_service.predict(payload)
    except (ValueError, TypeError) as exc:
        logger.warning("Prediction rejected: %s", exc)
        raise HTTPException(status_code=422, detail=f"Invalid feature payload: {exc}") from exc
    except ModelLoadError as exc:
        logger.error("Prediction failed, model unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="ML model is not available. Verify the model artifacts are in place and restart the service.",
        ) from exc
    except Exception as exc:  # noqa: BLE001 - never leak tracebacks to clients
        logger.exception("Unexpected prediction failure")
        raise HTTPException(status_code=500, detail="Prediction failed unexpectedly.") from exc
    return PredictionResponse(**result)


@app.post("/ml2/analyze", response_model=ML2AnalysisResponse, tags=["risk-intelligence"])
async def ml2_analyze(request: ML2AnalysisRequest) -> ML2AnalysisResponse:
    if not ml2_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="ML2 risk-intelligence engine is not available. Verify the ML2 artifacts are in place and restart the service.",
        )
    try:
        result = ml2_service.analyze(request)
    except ML2LoadError as exc:
        logger.error("ML2 analysis failed, engine unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="ML2 risk-intelligence engine is not available. Verify the ML2 artifacts are in place and restart the service.",
        ) from exc
    except ValueError as exc:
        logger.warning("ML2 analysis rejected: %s", exc)
        raise HTTPException(status_code=422, detail=f"Invalid ML2 analysis input: {exc}") from exc
    except Exception as exc:  # noqa: BLE001 - never leak tracebacks to clients
        logger.exception("Unexpected ML2 analysis failure")
        raise HTTPException(status_code=500, detail="ML2 analysis failed unexpectedly.") from exc
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=APP_ENV == "development")