# F-ATICS

A Formula 1 2026 fan site. Instead of a long scrolling page, it's a single
room — click a fixture and it opens into one of eight drawers.

**Live:** [f-atics.vercel.app](https://f-atics.vercel.app)

| Drawer | What's inside |
|---|---|
| Standings | Live 2026 driver and constructor tables |
| Calendar | Every round, with the winner shown for races already run |
| Team binders | All 11 constructors, ordered by championship position |
| Circuits | Track maps, lap records, DRS zones |
| Race predictor | Monte-Carlo win and podium probabilities for any circuit |
| Telemetry | Lap times, tyre strategy, pit stops, weather and team radio |
| Car anatomy | Fourteen parts of a 2026 car, annotated |
| Trivia | Ten questions drawn from a bank of 210 |

Standings and results come from [Jolpica](https://jolpi.ca) (an Ergast
mirror), session data from [OpenF1](https://openf1.org). Both are cached in
`localStorage`, and the site falls back to bundled data when they're
unreachable.

## Running it

Frontend only — this is all you need for everything except the ML backend:

```bash
npm install
npm run dev
```

Vite serves at `http://localhost:3000`.

### The ML backend (optional)

The predictor runs a local Monte-Carlo simulation in the browser and works
without this. The Python service adds an XGBoost model trained on 2015–2025
race data.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r ml_backend/requirements.txt
python3 ml_backend/server.py
```

It listens on `http://localhost:8000` and trains on first start (~15–30s),
caching the model to `ml_backend/data/model.pkl` for later runs. Endpoints:
`/health`, `/circuits`, `POST /predict`, `POST /retrain` — interactive docs
at `/docs`.

Point the frontend somewhere else with `VITE_ML_API_URL` in a `.env` file.

## Layout

```
index.html            entry point
script.js             standings, calendar, circuits, quiz rendering
room.css              the room and everything inside the drawers
design-system.css     tokens; theme-monolith.css layers on top
js/                   one module per concern (see below)
ml_backend/           FastAPI + XGBoost service
```

`js/` splits three ways: data (`season-live`, `telemetry-live`,
`form-2026`), the prediction model (`prediction-model.js` plus `gbt`,
`bayesian-weekend`, `walk-forward-backtest`, `model-calibration`), and
presentation (`room`, `masthead`, and the `*-layout` / `*-polish` modules
that shape each drawer).

## Notes

- PWA with a network-first service worker, so a stale cache never hides an
  update; images and fonts stay cache-first.
- Targets WCAG 2.1 AA — focus traps in modals, `aria-live` on anything that
  updates, and `prefers-reduced-motion` honoured throughout.
- Deploys to Vercel on push to `main`; the backend runs on Railway.

An independent fan project. Not affiliated with Formula One Management, the
FIA, or any constructor.

ISC © 2026
