#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  F-ATICS ML Backend — Start Script
#  Starts the Python FastAPI ML server then the frontend server
# ─────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

echo ""
echo "══════════════════════════════════════════"
echo "  F-ATICS AI — Starting ML Backend"
echo "══════════════════════════════════════════"

# Install dependencies quietly if not already installed
if ! python3 -c "import xgboost" 2>/dev/null; then
    echo "[setup] Installing Python dependencies..."
    pip install -r ml_backend/requirements.txt -q
fi

# Kill any existing server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

echo "[ml] Starting FastAPI server on http://localhost:8000"
echo "[ml] First run will fetch Ergast F1 data and train model (~30s)..."
echo ""

# Start ML backend in background, log to ml_backend/server.log
python3 ml_backend/server.py > ml_backend/server.log 2>&1 &
ML_PID=$!
echo "[ml] ML server PID: $ML_PID"
echo ""

echo "[frontend] Frontend running at http://localhost:8471"
echo ""
echo "Open http://localhost:8471 and use the AI Race Predictor"
echo "(ML backend trains automatically in background — takes ~30s first time)"
echo ""
echo "API docs: http://localhost:8000/docs"
echo "Health:   http://localhost:8000/health"
echo "To stop:  kill $ML_PID"

# Keep script alive
wait $ML_PID
