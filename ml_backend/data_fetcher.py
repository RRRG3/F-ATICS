"""
data_fetcher.py
───────────────
Pulls real Formula 1 historical data from the Ergast REST API.
Data is cached locally as CSV so we don't re-fetch on every server start.

Ergast API docs: http://ergast.com/mrd/
"""

import os
import time
import requests
import pandas as pd

BASE_URL = "http://ergast.com/api/f1"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

CACHE_RESULTS  = os.path.join(DATA_DIR, "race_results.csv")
CACHE_QUALI    = os.path.join(DATA_DIR, "qualifying.csv")
CACHE_STANDINGS= os.path.join(DATA_DIR, "constructor_standings.csv")

# Years to train on  (staying away from COVID-season anomalies but including them)
TRAIN_SEASONS = list(range(2015, 2026))


# ── low-level helpers ──────────────────────────────────────────────────────────

def _get_json(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(1 + attempt)
    return {}


def _safe_int(v, default=0):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


# ── race results ──────────────────────────────────────────────────────────────

def fetch_race_results(seasons=TRAIN_SEASONS, force=False) -> pd.DataFrame:
    if not force and os.path.exists(CACHE_RESULTS):
        print("[data] Loading cached race results…")
        return pd.read_csv(CACHE_RESULTS)

    print(f"[data] Fetching race results for {seasons[0]}–{seasons[-1]} from Ergast…")
    rows = []

    for season in seasons:
        url = f"{BASE_URL}/{season}/results.json?limit=1000"
        data = _get_json(url)
        races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])

        for race in races:
            circuit = race.get("Circuit", {}).get("circuitName", "")
            round_no = _safe_int(race.get("round", 0))
            for result in race.get("Results", []):
                driver_id = result.get("Driver", {}).get("driverId", "")
                driver_name = (
                    result.get("Driver", {}).get("givenName", "") + " " +
                    result.get("Driver", {}).get("familyName", "")
                ).strip()
                constructor = result.get("Constructor", {}).get("name", "")
                grid_pos = _safe_int(result.get("grid", 0))
                finish_pos = _safe_int(result.get("position", 30))
                status = result.get("status", "")
                points = _safe_float(result.get("points", 0))
                laps = _safe_int(result.get("laps", 0))
                rows.append({
                    "season": season,
                    "round": round_no,
                    "circuit": circuit,
                    "driver_id": driver_id,
                    "driver_name": driver_name,
                    "constructor": constructor,
                    "grid_pos": grid_pos,
                    "finish_pos": finish_pos,
                    "status": status,
                    "points": points,
                    "laps_completed": laps,
                    "dnf": 0 if status == "Finished" or status.startswith("+") else 1,
                })
        time.sleep(0.2)   # be polite to Ergast

    df = pd.DataFrame(rows)
    df.to_csv(CACHE_RESULTS, index=False)
    print(f"[data] Saved {len(df)} result rows.")
    return df


# ── qualifying ────────────────────────────────────────────────────────────────

def fetch_qualifying(seasons=TRAIN_SEASONS, force=False) -> pd.DataFrame:
    if not force and os.path.exists(CACHE_QUALI):
        print("[data] Loading cached qualifying data…")
        return pd.read_csv(CACHE_QUALI)

    print("[data] Fetching qualifying data…")
    rows = []

    for season in seasons:
        url = f"{BASE_URL}/{season}/qualifying.json?limit=1000"
        data = _get_json(url)
        races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])

        for race in races:
            circuit = race.get("Circuit", {}).get("circuitName", "")
            round_no = _safe_int(race.get("round", 0))
            for q in race.get("QualifyingResults", []):
                driver_id = q.get("Driver", {}).get("driverId", "")
                quali_pos = _safe_int(q.get("position", 20))
                rows.append({
                    "season": season,
                    "round": round_no,
                    "circuit": circuit,
                    "driver_id": driver_id,
                    "quali_pos": quali_pos,
                })
        time.sleep(0.2)

    df = pd.DataFrame(rows)
    df.to_csv(CACHE_QUALI, index=False)
    print(f"[data] Saved {len(df)} qualifying rows.")
    return df


# ── constructor standings ──────────────────────────────────────────────────────

def fetch_constructor_standings(seasons=TRAIN_SEASONS, force=False) -> pd.DataFrame:
    if not force and os.path.exists(CACHE_STANDINGS):
        print("[data] Loading cached constructor standings…")
        return pd.read_csv(CACHE_STANDINGS)

    print("[data] Fetching constructor standings…")
    rows = []

    for season in seasons:
        # Get end-of-year standings
        url = f"{BASE_URL}/{season}/constructorStandings.json"
        data = _get_json(url)
        lists = (data.get("MRData", {})
                     .get("StandingsTable", {})
                     .get("StandingsLists", []))
        if not lists:
            continue
        total_pts = sum(
            _safe_float(c.get("points", 0))
            for c in lists[0].get("ConstructorStandings", [])
        ) or 1
        for c in lists[0].get("ConstructorStandings", []):
            rows.append({
                "season": season,
                "constructor": c.get("Constructor", {}).get("name", ""),
                "constructor_pts": _safe_float(c.get("points", 0)),
                "constructor_pts_pct": _safe_float(c.get("points", 0)) / total_pts,
                "constructor_position": _safe_int(c.get("position", 10)),
            })
        time.sleep(0.2)

    df = pd.DataFrame(rows)
    df.to_csv(CACHE_STANDINGS, index=False)
    print(f"[data] Saved {len(df)} constructor standing rows.")
    return df


# ── merged dataset ─────────────────────────────────────────────────────────────

def load_full_dataset(force=False) -> pd.DataFrame:
    results  = fetch_race_results(force=force)
    quali    = fetch_qualifying(force=force)
    constr   = fetch_constructor_standings(force=force)

    # Merge qualifying position
    df = results.merge(
        quali[["season", "round", "driver_id", "quali_pos"]],
        on=["season", "round", "driver_id"],
        how="left",
    )
    df["quali_pos"] = df["quali_pos"].fillna(20)

    # Merge constructor standings (season-level)
    df = df.merge(
        constr[["season", "constructor", "constructor_pts_pct", "constructor_position"]],
        on=["season", "constructor"],
        how="left",
    )
    df["constructor_pts_pct"] = df["constructor_pts_pct"].fillna(0.05)
    df["constructor_position"] = df["constructor_position"].fillna(10)

    # Sort for time-series features
    df = df.sort_values(["driver_id", "season", "round"]).reset_index(drop=True)
    return df
