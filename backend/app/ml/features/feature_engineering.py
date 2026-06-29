"""Tabular feature engineering for C-MAPSS (Ticket 2.3)."""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from app.ml.data.cmapss_schema import CMAPSS_COLUMNS
from app.ml.data.rul_labels import DEFAULT_RUL_CAP

ENGINE_COL = "engine_id"
CYCLE_COL = "cycle"

SETTING_COLUMNS = ["op_setting_1", "op_setting_2", "op_setting_3"]
SENSOR_COLUMNS = [f"sensor_{i}" for i in range(1, 22)]
BASE_FEATURE_COLUMNS = SETTING_COLUMNS + SENSOR_COLUMNS

ROLLING_WINDOWS = (5, 10, 20)
SLOPE_WINDOWS = (5, 10, 20)

METADATA_COLUMNS = {ENGINE_COL, CYCLE_COL, "raw_rul", "rul"}


def _sorted_copy(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.sort_values([ENGINE_COL, CYCLE_COL]).copy()


def _rolling_stat(
    frame: pd.DataFrame,
    column: str,
    window: int,
    stat: str,
) -> pd.Series:
    grouped = frame.groupby(ENGINE_COL, sort=False)[column]
    roller = grouped.transform(lambda series: series.rolling(window=window, min_periods=1).agg(stat))
    if stat == "std":
        return roller.fillna(0.0)
    return roller


def _degradation_slope(frame: pd.DataFrame, column: str, window: int) -> pd.Series:
    shifted = frame.groupby(ENGINE_COL, sort=False)[column].shift(window - 1)
    slope = (frame[column] - shifted) / float(window - 1)
    return slope.fillna(0.0)


def engineer_tabular_features(
    frame: pd.DataFrame,
    rul_cap: int = DEFAULT_RUL_CAP,
) -> pd.DataFrame:
    """
    Build tabular features using only current and past cycles per engine.

    Uses trailing rolling windows and lagged deltas to avoid future leakage.
    """
    missing = set(BASE_FEATURE_COLUMNS) - set(frame.columns)
    if missing:
        raise ValueError(f"Missing required sensor/setting columns: {sorted(missing)}")

    featured = _sorted_copy(frame)
    new_columns: dict[str, pd.Series] = {}

    for column in BASE_FEATURE_COLUMNS:
        new_columns[f"delta_{column}"] = (
            featured.groupby(ENGINE_COL, sort=False)[column].diff().fillna(0.0)
        )

    for window in ROLLING_WINDOWS:
        for column in BASE_FEATURE_COLUMNS:
            new_columns[f"roll_mean_{window}_{column}"] = _rolling_stat(featured, column, window, "mean")
            new_columns[f"roll_std_{window}_{column}"] = _rolling_stat(featured, column, window, "std")

    for window in SLOPE_WINDOWS:
        for column in BASE_FEATURE_COLUMNS:
            new_columns[f"slope_{window}_{column}"] = _degradation_slope(featured, column, window)

    new_columns["normalized_cycle_ratio"] = featured[CYCLE_COL] / float(rul_cap)

    return pd.concat([featured, pd.DataFrame(new_columns, index=featured.index)], axis=1)


def get_model_feature_columns(frame: Optional[pd.DataFrame] = None) -> list[str]:
    """Return ordered model feature column names."""
    columns: list[str] = list(BASE_FEATURE_COLUMNS)

    for column in BASE_FEATURE_COLUMNS:
        columns.append(f"delta_{column}")

    for window in ROLLING_WINDOWS:
        for column in BASE_FEATURE_COLUMNS:
            columns.append(f"roll_mean_{window}_{column}")
            columns.append(f"roll_std_{window}_{column}")

    for window in SLOPE_WINDOWS:
        for column in BASE_FEATURE_COLUMNS:
            columns.append(f"slope_{window}_{column}")

    columns.append("normalized_cycle_ratio")

    if frame is not None:
        missing = [name for name in columns if name not in frame.columns]
        if missing:
            raise ValueError(f"Engineered frame missing features: {missing[:5]}")

    return columns


def assert_required_input_columns(frame: pd.DataFrame) -> None:
    required = {ENGINE_COL, CYCLE_COL, *BASE_FEATURE_COLUMNS}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Input frame missing columns: {sorted(missing)}")

    unknown = set(frame.columns) - set(CMAPSS_COLUMNS) - METADATA_COLUMNS
    if unknown:
        raise ValueError(f"Unexpected columns in input frame: {sorted(unknown)}")
