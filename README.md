# F-ATICS — Ultimate F1 2026 Fan Zone

> The way you follow F1 is about to change.

A full-stack Formula 1 fan hub for the 2026 season — AI-powered race predictions, live telemetry streaming, interactive circuit explorer, team showcase, driver standings, race calendar, and an F1 knowledge quiz. Built with vanilla JS + Vite on the frontend and a Python FastAPI + XGBoost ML backend.

**Live site:** [f-atics.vercel.app](https://f-atics.vercel.app)

---

## Features

| Section | What it does |
|---|---|
| **AI Race Predictor** | Selects a circuit + weather condition and gets a predicted podium from an XGBoost ensemble trained on 2015–2025 Ergast F1 data |
| **Live Telemetry** | Streams real car speed and throttle data from the OpenF1 API during race weekends; falls back to a realistic physics simulation when offline |
| **Driver Standings** | Live 2026 standings pulled from Jolpica (Ergast mirror) with a 1-hour localStorage cache; pre-loaded with pre-season fallback data |
| **Race Calendar** | All 24 rounds with live countdowns, sprint markers, and Madrid 2026 debut highlight |
| **Circuit Explorer** | 24 circuits with DRS zone count, circuit-type badges, top-speed data, lap records, and a detail modal |
| **Team Showcase** | All 11 constructors including new entrants Audi and Cadillac, with 3D car model viewer (Three.js) |
| **F1 Quiz** | 20-question quiz with results sharing to X / clipboard |
| **F1 Basics** | Beginner-friendly explainers on points, tyres, DRS, and 2026 rule changes |
| **Team Themes** | Switch the site colour scheme to any of the 11 constructor palettes |

---

## Tech Stack

### Frontend
- **Vanilla JS** (ES Modules) + **Vite 5** for bundling and dev server
- **Three.js** — 3D F1 car viewer (lazy-loaded via IntersectionObserver)
- **GSAP 3 + ScrollTrigger** — scroll-driven animations
- **Lenis** — smooth scroll
- **Vanilla Tilt** — card tilt on hover
- **Chart.js** — live telemetry speed/throttle chart
- **Howler.js** — UI audio feedback
- **Service Worker** — PWA with cache-first asset strategy

### Backend (ML)
- **Python 3.11+** / **FastAPI** — REST API
- **XGBoost** — race outcome prediction model
- **scikit-learn** — feature engineering + preprocessing
- **pandas / numpy** — Ergast data pipeline
- **Uvicorn** — ASGI server

### External APIs / Data
- [OpenF1 API](https://openf1.org) — live car telemetry
- [Jolpica / Ergast mirror](https://jolpi.ca) — live driver standings
- [FIA Calendar](https://www.fia.com) — official 2026 race schedule
- [Sketchfab](https://sketchfab.com) — 3D car models

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.11+ |

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/RRRG3/F-ATICS.git
cd F-ATICS
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up the Python ML backend

```bash
# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

# Install Python dependencies
pip install -r ml_backend/requirements.txt
```

### 4. Start the ML backend

```bash
# From the project root
python3 ml_backend/server.py
```

On first run the server fetches Ergast F1 data (2015–2025) and trains the model — takes **~15–30 seconds**. Subsequent starts load the cached model in ~1 second.

The API will be available at `http://localhost:8000`.

### 5. Start the frontend dev server

Open a second terminal:

```bash
npm run dev
```

Vite starts at `http://localhost:5173`.

### One-command start (macOS / Linux)

The `start_ml.sh` script starts both servers sequentially:

```bash
chmod +x start_ml.sh
./start_ml.sh
```

---

## Environment Variables

Create a `.env` file at the project root for local overrides:

```env
VITE_ML_API_URL=http://localhost:8000
```

For production builds the URL is set in `.env.production`:

```env
VITE_ML_API_URL=https://f-atics-ml.up.railway.app
```

---

## ML API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server + model status |
| `GET` | `/circuits` | List all circuits with type metadata |
| `POST` | `/predict` | Run a podium prediction |
| `POST` | `/retrain` | Force data re-fetch and model retrain |

### `POST /predict` — example

**Request:**
```json
{
  "circuit": "Circuit de Monaco",
  "weather": "dry"
}
```

**Response:**
```json
{
  "top3": [
    { "driver": "Charles Leclerc", "team": "Ferrari", "win_prob": 0.34 },
    { "driver": "Max Verstappen", "team": "Red Bull Racing", "win_prob": 0.21 },
    { "driver": "Lando Norris",   "team": "McLaren",         "win_prob": 0.18 }
  ],
  "circuit": "Circuit de Monaco",
  "weather": "dry",
  "model_version": "xgboost-2015-2025"
}
```

**Weather options:** `dry` | `wet` | `mixed`

Interactive docs available at `http://localhost:8000/docs` while the backend is running.

---

## Project Structure

```
F-ATICS/
├── index.html               # Main entry point
├── styles.css               # All styles (8k+ lines, single source of truth)
├── script.js                # Core app logic — quiz, standings, modals, calendar
├── circuits-data.js         # 24 circuit objects with DRS, type, lap record
├── quiz-data.js             # 20 F1 quiz questions
├── race-calendar-data.js    # 24 round 2026 calendar
├── prediction-model.js      # Frontend prediction UI bridge
├── vite.config.js           # Vite build config + ML API URL injection
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker (cache-first)
├── robots.txt               # Crawler rules
├── sitemap.xml              # Sitemap for all major sections
│
├── js/                      # ES Module sub-system
│   ├── live-dashboard.js    # Live telemetry dashboard + simulation engine
│   ├── telemetry-api.js     # OpenF1 API client
│   ├── theme-engine.js      # Constructor colour theme switcher
│   ├── router.js            # Hash-based scroll router
│   ├── car-360.js           # Three.js 3D car viewer
│   ├── animation-controller.js
│   ├── app-init.js
│   ├── asset-loader.js
│   ├── performance-monitor.js
│   ├── webgl-engine.js
│   └── ml-prediction-ui.js
│
├── ml_backend/              # Python FastAPI ML service
│   ├── server.py            # FastAPI app + endpoints
│   ├── model.py             # XGBoost training + inference
│   ├── features.py          # Feature engineering
│   ├── data_fetcher.py      # Ergast/Jolpica data pipeline
│   └── requirements.txt
│
├── icons/
│   └── icon.svg             # PWA icon
└── public/
    └── audio/               # UI sound effects (Howler.js)
```

---

## Production Build

```bash
npm run build
```

Output goes to `dist/`. The build injects `VITE_ML_API_URL` from `.env.production` so the frontend points at the deployed Railway ML service automatically.

```bash
# Preview the production build locally
npm run preview
```

---

## Deployment

| Service | What runs there |
|---|---|
| [Vercel](https://vercel.app) | Frontend — auto-deploys on every push to `main` |
| [Railway](https://railway.app) | ML backend — `python ml_backend/server.py` |

Vercel needs no build config beyond detecting Vite. Railway auto-detects Python and runs `server.py`.

---

## PWA / Offline

F-ATICS is a Progressive Web App:

- **Install prompt** available on Chrome / Edge / Android
- **Cache-first** service worker caches the app shell (HTML, CSS, JS, data files) after first visit
- **Offline** — the site is fully usable without network (standings fall back to pre-season data, telemetry switches to simulation)

---

## Accessibility

- WCAG 2.1 AA targeted
- `prefers-reduced-motion` — all CSS animations, parallax, and shimmer are suppressed system-wide when the user has motion reduction enabled
- Focus trap inside modals (Tab/Shift-Tab cycles within the dialog)
- Skip navigation link (keyboard-visible on focus)
- `aria-live` regions for quiz results, telemetry status, standings
- All interactive elements have `aria-label` or visible labels
- `role="dialog"` + `aria-modal` on all modals

---

## Data Attribution

- **Standings:** [Jolpica](https://jolpi.ca) (open Ergast F1 mirror)
- **Live Telemetry:** [OpenF1](https://openf1.org)
- **Race Calendar:** [FIA](https://www.fia.com)
- **3D Car Models:** [Sketchfab](https://sketchfab.com)
- **Historical Race Data (ML):** [Ergast Developer API](https://ergast.com/mrd/) via Jolpica

*F-ATICS is an independent fan project. Not affiliated with Formula One Management, the FIA, or any F1 constructor.*

---

## Contributing

Pull requests welcome. For major changes please open an issue first.

```bash
git checkout -b feature/your-feature
# make changes
git commit -m "feat: describe the change"
git push origin feature/your-feature
# open a PR against main
```

---

## License

ISC © 2026 F-ATICS
