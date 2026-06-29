"""RUL label computation for C-MAPSS training data (Ticket 2.2)."""

from __future__ import annotations

import pandas as pd

DEFAULT_RUL_CAP = 130


def compute_training_rul_labels(
    frame: pd.DataFrame,
    cap: int = DEFAULT_RUL_CAP,
    engine_col: str = "engine_id",
    cycle_col: str = "cycle",
) -> pd.DataFrame:
    """
    Compute raw and capped RUL for training trajectories.

    raw_rul = max_cycle_for_engine - current_cycle
    rul = min(raw_rul, cap)
    """
    if cap <= 0:
        raise ValueError("RUL cap must be positive")

    required = {engine_col, cycle_col}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns for RUL labeling: {sorted(missing)}")

    labeled = frame.copy()
    max_cycle = labeled.groupby(engine_col)[cycle_col].transform("max")
    labeled["raw_rul"] = max_cycle - labeled[cycle_col]
    labeled["rul"] = labeled["raw_rul"].clip(upper=cap)

    if (labeled["raw_rul"] < 0).any():
        raise ValueError("Computed negative raw_rul values; check cycle ordering per engine")

    return labeled


def assert_training_rul_valid(frame: pd.DataFrame, cap: int = DEFAULT_RUL_CAP) -> None:
    """Validate RUL labels on a training dataframe."""
    if "raw_rul" not in frame.columns or "rul" not in frame.columns:
        raise ValueError("Dataframe must contain raw_rul and rul columns")

    last_cycles = frame.loc[frame.groupby("engine_id")["cycle"].transform("max") == frame["cycle"]]
    if not (last_cycles["raw_rul"] == 0).all():
        raise ValueError("Last cycle per engine must have raw_rul == 0")
    if not (last_cycles["rul"] == 0).all():
        raise ValueError("Last cycle per engine must have rul == 0")

    if (frame["rul"] < 0).any() or (frame["raw_rul"] < 0).any():
        raise ValueError("RUL values must be non-negative")

    if (frame["rul"] > cap).any():
        raise ValueError(f"RUL values must not exceed cap ({cap})")

    if (frame["rul"] > frame["raw_rul"]).any():
        raise ValueError("Capped RUL must not exceed raw RUL")
