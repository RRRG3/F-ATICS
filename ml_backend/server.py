"""
server.py
─────────
FastAPI REST API for F1 race predictions.

Endpoints:
  GET  /health        — server + model status
  GET  /circuits      — list of all circuits with metadata
  POST /predict       — run prediction for circuit + weather
  POST /retrain       — force re-download data and retrain

Usage:
  python server.py

The model trains automatically on first start (~15-30s).
Subsequent starts load from disk cache (~1s).
"""

import os
import sys
import time
import threading
import traceback
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(__file__))

from model import F1PredictionModel, MODEL_FILE
from features import CIRCUIT_TYPES

# ── Global model state ─────────────────────────────────────────────────────────

model: F1PredictionModel = None
model_status = "not_loaded"
model_error  = ""
data_version = ""


def _load_or_train():
    global model, model_status, model_error, data_version
    try:
        if os.path.exists(MODEL_FILE):
            print("[server] Loading trained model from disk…")
            model_status = "loading"
            model = F1PredictionModel.load()
            model_status = "ready"
            data_version = "2015-2025"
            print("[server] Model loaded successfully.")
        else:
            print("[server] No cached model found — training from scratch…")
            model_status = "training"
            m = F1PredictionModel()
            m.train(force_download=False)
            model = m
            model_status = "ready"
            data_version = "2015-2025"
    except Exception as e:
        model_status = "error"
        model_error  = str(e)
        traceback.print_exc()
        print(f"[server] Model load/train failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start model loading in background thread so server starts immediately
    t = threading.Thread(target=_load_or_train, daemon=True)
    t.start()
    yield


# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="F-ATICS AI Race Predictor — ML Backend",
    description=(
        "Production ML API for F1 race predictions. "
        "Uses XGBoost (trained on 2015-2025 Ergast data) + LSTM form model."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Allow all origins (CORS) so the frontend at localhost:8471 can call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response schemas ──────────────────────────────────────────────────

class PredictRequest(BaseModel):
    circuit: str = Field(..., description="Full circuit name, e.g. 'Silverstone Circuit'")
    weather: str = Field("dry", description="'dry' | 'wet' | 'mixed'")


class DriverPrediction(BaseModel):
    position: int
    name: str
    team: str
    win_pct: float
    podium_pct: float
    top10_pct: float
    exp_pos: float
    lstm_form: float
    quali_pos: int
    feature_importance: dict


class PredictResponse(BaseModel):
    circuit: str
    weather: str
    model_version: str
    data_version: str
    prediction_time_ms: float
    results: list[DriverPrediction]


class HealthResponse(BaseModel):
    status: str
    model_trained: bool
    model_status: str
    data_version: str
    error: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok",
        model_trained=model is not None and model.trained,
        model_status=model_status,
        data_version=data_version,
        error=model_error,
    )


@app.get("/circuits")
def list_circuits():
    """Return all circuits with their type classification."""
    return {
        "circuits": [
            {"name": name, "type": ctype}
            for name, ctype in CIRCUIT_TYPES.items()
        ]
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or not model.trained:
        raise HTTPException(
            status_code=503,
            detail=f"Model not ready yet — status: {model_status}. Please wait and retry.",
        )

    if req.weather not in ("dry", "wet", "mixed"):
        raise HTTPException(status_code=400, detail="weather must be 'dry', 'wet', or 'mixed'")

    t0 = time.perf_counter()
    try:
        results = model.predict(circuit=req.circuit, weather=req.weather)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    elapsed_ms = (time.perf_counter() - t0) * 1000

    return PredictResponse(
        circuit=req.circuit,
        weather=req.weather,
        model_version="xgb+lstm-ensemble-v2",
        data_version=data_version,
        prediction_time_ms=round(elapsed_ms, 1),
        results=[DriverPrediction(**r) for r in results],
    )


@app.post("/retrain")
def retrain(force: bool = False):
    """Force re-download data and retrain the model. Can take 30-60s."""
    global model, model_status
    if model_status == "training":
        return {"message": "Already training."}
    model_status = "training"

    def _do_retrain():
        global model, model_status, model_error
        try:
            m = F1PredictionModel()
            m.train(force_download=force)
            model = m
            model_status = "ready"
        except Exception as e:
            model_status = "error"
            model_error  = str(e)

    t = threading.Thread(target=_do_retrain, daemon=True)
    t.start()
    return {"message": "Retraining started in background. Check /health for status."}


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
