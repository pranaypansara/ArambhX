"""FastAPI entrypoint for the standalone ML1 prediction service.

Run:      uvicorn main:app --reload
Or:       python main.py

Endpoints:
  GET  /health   - service + model availability
  POST /predict  - ML1 inference on a Phase 3 feature payload
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from app.services.prediction_service import (
    ModelLoadError,
    prediction_service,
)
from app.schemas.prediction import ML1FeaturesRequest, PredictionResponse
from app.config import APP_ENV, HOST, PORT

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ml1.service")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Eager model load at startup. Missing/corrupt artifacts must NOT crash the
    # process — /health reflects availability and /predict returns 503.
    try:
        prediction_service.load()
    except ModelLoadError as exc:
        logger.error("Startup model load failed: %s", exc)
    yield


app = FastAPI(
    title="ML1 Dropout Prediction Service",
    description="Standalone FastAPI service that loads the trained ML1 artifact "
    "and runs dropout-risk inference on the Phase 3 ML feature payload.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, object]:
    return {
        "status": "healthy",
        "model_loaded": prediction_service.is_loaded,
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=APP_ENV == "development")