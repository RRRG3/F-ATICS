"""
features.py
───────────
Feature engineering pipeline for F1 race prediction.
Generates tabular features from raw Ergast data, following quant finance
conventions: rolling means, EMA momentum signals, and regime flags.
"""

import numpy as np
import pandas as pd


# ── EMA helper ────────────────────────────────────────────────────────────────

def ema_series(series: pd.Series, alpha: float = None) -> pd.Series:
    """Exponential Moving Average — same formula as stock trading indicators."""
    if alpha is None:
        n = max(len(series), 1)
        alpha = 2 / (n + 1)
    return series.ewm(alpha=alpha, adjust=False).mean()


# ── circuit type encoding ──────────────────────────────────────────────────────

CIRCUIT_TYPES = {
    # high downforce / street
    "Circuit de Monaco":                   "street_high_df",
    "Marina Bay Street Circuit":           "street_high_df",
    "Baku City Circuit":                   "street_power",
    "Madrid Street Circuit":               "street_high_df",

    # power / low downforce
    "Autodromo Nazionale Monza":           "power",
    "Jeddah Corniche Circuit":             "power",
    "Las Vegas Strip Circuit":             "power",

    # balanced / technical
    "Silverstone Circuit":                 "high_speed",
    "Spa-Francorchamps":                   "high_speed",
    "Suzuka Circuit":                      "technical",
    "Circuit de Barcelona-Catalunya":      "technical",
    "Hungaroring":                         "technical_high_df",
    "Circuit of the Americas":             "technical",
    "Autodromo Hermanos Rodriguez":        "technical",
    "Autodromo Jose Carlos Pace":          "technical",
    "Red Bull Ring":                       "high_speed",
    "Circuit Gilles Villeneuve":           "power",
    "Albert Park Circuit":                 "balanced",
    "Bahrain International Circuit":       "balanced",
    "Lusail International Circuit":        "balanced",
    "Miami International Autodrome":       "balanced",
    "Yas Marina Circuit":                  "balanced",
    "Imola":                               "technical",
    "Shanghai International Circuit":      "balanced",
}

CIRCUIT_TYPE_CODES = {
    "street_high_df":     0,
    "street_power":       1,
    "power":              2,
    "high_speed":         3,
    "technical":          4,
    "technical_high_df":  5,
    "balanced":           6,
}


def circuit_type_code(circuit: str) -> int:
    ct = CIRCUIT_TYPES.get(circuit, "balanced")
    return CIRCUIT_TYPE_CODES.get(ct, 6)


# ── per-driver rolling features ────────────────────────────────────────────────

def build_driver_form_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each (driver, race) row computes:
      - rolling_avg_finish_3/5/10  : mean finishing position over last N races
      - form_ema_10                : EMA of finish positions (last 10 races)
      - form_ema_5                 : EMA of finish positions (last 5 races)
      - quali_to_race_delta_avg5   : mean(grid - finish) over last 5 races
                                     positive = usually gains positions in race
      - dnf_rate_10                : DNF frequency over last 10 races
      - circuit_wins               : historical wins at this specific circuit
      - circuit_avg_finish         : historical avg finish at this circuit
    """
    df = df.sort_values(["driver_id", "season", "round"]).copy()
    rows = []

    for driver_id, grp in df.groupby("driver_id"):
        grp = grp.reset_index(drop=True)
        finish = grp["finish_pos"].values
        grid = grp["grid_pos"].values
        dnf = grp["dnf"].values
        circuits = grp["circuit"].values

        for i in range(len(grp)):
            # Only look at races BEFORE this one (no leakage)
            past = slice(max(0, i - 10), i)
            past5 = slice(max(0, i - 5), i)
            past3 = slice(max(0, i - 3), i)
            n_past = i  # number of prior races

            roll10 = float(np.mean(finish[past])) if i > 0 else 10.0
            roll5  = float(np.mean(finish[past5])) if i > 0 else 10.0
            roll3  = float(np.mean(finish[past3])) if i > 0 else 10.0

            # EMA momentum — uses pandas ewm on the past slice
            fs = pd.Series(finish[:i]) if i > 0 else pd.Series([10.0])
            ema10_ = float(ema_series(fs, alpha=2/11).iloc[-1])
            ema5_  = float(ema_series(fs, alpha=2/6).iloc[-1])

            # Qualifying-to-race delta (positive = gains positions)
            delta = grid[:i] - finish[:i]   # positive when finish < grid (moved up)
            avg_delta5 = float(np.mean(delta[past5])) if i > 0 else 0.0

            dnf_rate = float(np.mean(dnf[past])) if i > 0 else 0.0

            # Circuit-specific history (only past races at same circuit)
            same_circuit_mask = (circuits[:i] == circuits[i])
            sc_finish = finish[:i][same_circuit_mask]
            circuit_wins_ = int(np.sum(sc_finish == 1))
            circuit_avg_  = float(np.mean(sc_finish)) if len(sc_finish) > 0 else 10.0

            row = grp.iloc[i].to_dict()
            row.update({
                "rolling_avg_finish_10": roll10,
                "rolling_avg_finish_5":  roll5,
                "rolling_avg_finish_3":  roll3,
                "form_ema_10": ema10_,
                "form_ema_5":  ema5_,
                "quali_to_race_delta_avg5": avg_delta5,
                "dnf_rate_10": dnf_rate,
                "circuit_wins": circuit_wins_,
                "circuit_avg_finish": circuit_avg_,
                "circuit_type": circuit_type_code(circuits[i]),
                "n_prior_races": min(n_past, 100),
            })
            rows.append(row)

    return pd.DataFrame(rows)


# ── full feature matrix ───────────────────────────────────────────────────────

FEATURE_COLS = [
    "quali_pos",
    "rolling_avg_finish_10",
    "rolling_avg_finish_5",
    "rolling_avg_finish_3",
    "form_ema_10",
    "form_ema_5",
    "quali_to_race_delta_avg5",
    "dnf_rate_10",
    "circuit_wins",
    "circuit_avg_finish",
    "circuit_type",
    "constructor_pts_pct",
    "constructor_position",
    "n_prior_races",
]

TARGET_WIN    = "win"        # binary: finished P1
TARGET_PODIUM = "podium"     # binary: finished P1–P3
TARGET_TOP10  = "top10"      # binary: finished P1–P10
TARGET_POS    = "finish_pos" # regression target


def build_feature_matrix(df_with_features: pd.DataFrame):
    """
    Returns X (feature matrix), y_win, y_podium, y_top10, y_pos.
    Only uses rows where we have at least 3 prior races (avoids cold-start noise).
    """
    df = df_with_features.copy()

    # Binary labels
    df["win"]    = (df["finish_pos"] == 1).astype(int)
    df["podium"] = (df["finish_pos"] <= 3).astype(int)
    df["top10"]  = (df["finish_pos"] <= 10).astype(int)

    # Filter cold-start races
    df = df[df["n_prior_races"] >= 3].copy()

    X = df[FEATURE_COLS].fillna(0).values
    return X, df["win"].values, df["podium"].values, df["top10"].values, df["finish_pos"].values, df


# ── inference feature builder ─────────────────────────────────────────────────

def build_inference_features(
    driver_history: pd.DataFrame,
    driver_name: str,
    driver_id: str,
    circuit: str,
    weather: str,
    quali_pos: int,
    constructor: str,
    constructor_pts_pct: float,
    constructor_position: int,
) -> np.ndarray:
    """
    Build a single-row feature vector for an upcoming race prediction.
    driver_history: all past race_results rows for this driver.
    """
    finish = driver_history["finish_pos"].values if len(driver_history) > 0 else np.array([10.0])
    grid   = driver_history["grid_pos"].values   if len(driver_history) > 0 else np.array([quali_pos])
    dnf_   = driver_history["dnf"].values        if len(driver_history) > 0 else np.array([0])
    circs  = driver_history["circuit"].values    if len(driver_history) > 0 else np.array([""])

    n = len(finish)
    roll10 = float(np.mean(finish[-10:])) if n > 0 else 10.0
    roll5  = float(np.mean(finish[-5:]))  if n > 0 else 10.0
    roll3  = float(np.mean(finish[-3:]))  if n > 0 else 10.0

    fs = pd.Series(finish[-10:]) if n > 0 else pd.Series([10.0])
    ema10_ = float(ema_series(fs, alpha=2/11).iloc[-1])
    ema5_  = float(ema_series(pd.Series(finish[-5:]) if n > 0 else pd.Series([10.0]), alpha=2/6).iloc[-1])

    delta = (grid - finish)[-5:]
    avg_delta5 = float(np.mean(delta)) if len(delta) > 0 else 0.0

    dnf_rate = float(np.mean(dnf_[-10:])) if n > 0 else 0.0

    same_circuit_mask = (circs == circuit)
    sc_finish = finish[same_circuit_mask]
    circuit_wins_ = int(np.sum(sc_finish == 1))
    circuit_avg_  = float(np.mean(sc_finish)) if len(sc_finish) > 0 else 10.0

    return np.array([[
        quali_pos,
        roll10,
        roll5,
        roll3,
        ema10_,
        ema5_,
        avg_delta5,
        dnf_rate,
        circuit_wins_,
        circuit_avg_,
        circuit_type_code(circuit),
        constructor_pts_pct,
        constructor_position,
        min(n, 100),
    ]], dtype=float)
