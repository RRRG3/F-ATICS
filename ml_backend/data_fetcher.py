"""
data_fetcher.py
───────────────
Pulls real Formula 1 historical data from the Jolpica F1 API
(official Ergast replacement, active since March 2024).
Data is cached locally as CSV so we don't re-fetch on every server start.

API docs: https://api.jolpi.ca/
"""

import os
import time
import requests
import pandas as pd

BASE_URL = "https://api.jolpi.ca/ergast/f1"   # Jolpica — Ergast API successor
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

CACHE_RESULTS   = os.path.join(DATA_DIR, "race_results.csv")
CACHE_QUALI     = os.path.join(DATA_DIR, "qualifying.csv")
CACHE_STANDINGS = os.path.join(DATA_DIR, "constructor_standings.csv")

# Training window — 2018-2025 gives enough data without ancient car regulations
TRAIN_SEASONS = list(range(2018, 2026))


# ── helpers ───────────────────────────────────────────────────────────────────

def _get(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 ** attempt)
    return {}


def _safe_int(v, default=0):
    try:    return int(v)
    except: return default

def _safe_float(v, default=0.0):
    try:    return float(v)
    except: return default


# ── race results — paginated per-round ────────────────────────────────────────

def _rounds_in_season(season: int) -> int:
    """How many rounds were in a given season."""
    data = _get(f"{BASE_URL}/{season}.json?limit=30")
    return len(data.get("MRData", {}).get("RaceTable", {}).get("Races", []))


def fetch_race_results(seasons=TRAIN_SEASONS, force=False) -> pd.DataFrame:
    if not force and os.path.exists(CACHE_RESULTS):
        print("[data] Loading cached race results…")
        return pd.read_csv(CACHE_RESULTS)

    print(f"[data] Fetching race results for {seasons[0]}–{seasons[-1]} from Jolpica…")
    rows = []

    for season in seasons:
        num_rounds = _rounds_in_season(season)
        print(f"  Season {season}: {num_rounds} rounds")

        for rnd in range(1, num_rounds + 1):
            # Fetch all drivers in a race using limit=25 (max grid = 22)
            url = f"{BASE_URL}/{season}/{rnd}/results.json?limit=25"
            data = _get(url)
            races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            if not races:
                continue
            race = races[0]
            circuit = race.get("Circuit", {}).get("circuitName", "")

            for result in race.get("Results", []):
                driver_id   = result.get("Driver", {}).get("driverId", "")
                driver_name = (
                    result.get("Driver", {}).get("givenName", "") + " " +
                    result.get("Driver", {}).get("familyName", "")
                ).strip()
                constructor = result.get("Constructor", {}).get("name", "")
                grid_pos    = _safe_int(result.get("grid", 0))
                finish_pos  = _safe_int(result.get("position", 22))
                status      = result.get("status", "")
                points      = _safe_float(result.get("points", 0))
                laps        = _safe_int(result.get("laps", 0))
                rows.append({
                    "season":          season,
                    "round":           rnd,
                    "circuit":         circuit,
                    "driver_id":       driver_id,
                    "driver_name":     driver_name,
                    "constructor":     constructor,
                    "grid_pos":        grid_pos,
                    "finish_pos":      finish_pos,
                    "status":          status,
                    "points":          points,
                    "laps_completed":  laps,
                    "dnf": 0 if (status == "Finished" or status.startswith("+")) else 1,
                })
            time.sleep(0.15)   # polite rate limiting

    df = pd.DataFrame(rows)
    df.to_csv(CACHE_RESULTS, index=False)
    print(f"[data] Saved {len(df)} result rows across {len(seasons)} seasons.")
    return df


# ── qualifying — per round ────────────────────────────────────────────────────

def fetch_qualifying(seasons=TRAIN_SEASONS, force=False) -> pd.DataFrame:
    if not force and os.path.exists(CACHE_QUALI):
        print("[data] Loading cached qualifying data…")
        return pd.read_csv(CACHE_QUALI)

    print("[data] Fetching qualifying data…")
    rows = []

    for season in seasons:
        num_rounds = _rounds_in_season(season)
        for rnd in range(1, num_rounds + 1):
            url = f"{BASE_URL}/{season}/{rnd}/qualifying.json?limit=25"
            data = _get(url)
            races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            if not races:
                continue
            race = races[0]
            circuit = race.get("Circuit", {}).get("circuitName", "")
            for q in race.get("QualifyingResults", []):
                driver_id = q.get("Driver", {}).get("driverId", "")
                quali_pos = _safe_int(q.get("position", 20))
                rows.append({
                    "season":    season,
                    "round":     rnd,
                    "circuit":   circuit,
                    "driver_id": driver_id,
                    "quali_pos": quali_pos,
                })
            time.sleep(0.15)

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
        url = f"{BASE_URL}/{season}/constructorStandings.json"
        data = _get(url)
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
                "season":               season,
                "constructor":          c.get("Constructor", {}).get("name", ""),
                "constructor_pts":      _safe_float(c.get("points", 0)),
                "constructor_pts_pct":  _safe_float(c.get("points", 0)) / total_pts,
                "constructor_position": _safe_int(c.get("position", 10)),
            })
        time.sleep(0.15)

    df = pd.DataFrame(rows)
    df.to_csv(CACHE_STANDINGS, index=False)
    print(f"[data] Saved {len(df)} constructor standing rows.")
    return df


# ── merged dataset ─────────────────────────────────────────────────────────────

def load_full_dataset(force=False) -> pd.DataFrame:
    results = fetch_race_results(force=force)
    quali   = fetch_qualifying(force=force)
    constr  = fetch_constructor_standings(force=force)

    df = results.merge(
        quali[["season", "round", "driver_id", "quali_pos"]],
        on=["season", "round", "driver_id"],
        how="left",
    )
    df["quali_pos"] = df["quali_pos"].fillna(20)

    df = df.merge(
        constr[["season", "constructor", "constructor_pts_pct", "constructor_position"]],
        on=["season", "constructor"],
        how="left",
    )
    df["constructor_pts_pct"]  = df["constructor_pts_pct"].fillna(0.05)
    df["constructor_position"] = df["constructor_position"].fillna(10)

    df = df.sort_values(["driver_id", "season", "round"]).reset_index(drop=True)
    print(f"[data] Full dataset: {len(df)} rows, {df['driver_id'].nunique()} drivers, "
          f"{df['circuit'].nunique()} circuits")
    return df
