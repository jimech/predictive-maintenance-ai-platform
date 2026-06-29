"""Sliding sequence windows for LSTM/GRU models (Ticket 2.4)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd

from app.ml.features.feature_engineering import CYCLE_COL, ENGINE_COL

DEFAULT_SEQUENCE_WINDOW_SIZE = 30


@dataclass(frozen=True)
class SequenceWindowBatch:
    """Batch of sequence windows for training or inference."""

    features: np.ndarray
    targets: Optional[np.ndarray]
    engine_ids: np.ndarray
    end_cycles: np.ndarray

    @property
    def sample_count(self) -> int:
        return int(self.features.shape[0])

    @property
    def window_size(self) -> int:
        return int(self.features.shape[1])

    @property
    def feature_count(self) -> int:
        return int(self.features.shape[2])


def _windows_for_engine(
    values: np.ndarray,
    targets: Optional[np.ndarray],
    engine_id: int,
    cycles: np.ndarray,
    window_size: int,
    pad_value: float,
) -> tuple[np.ndarray, Optional[np.ndarray], np.ndarray, np.ndarray]:
    cycle_count, feature_count = values.shape
    windows = np.full((cycle_count, window_size, feature_count), pad_value, dtype=np.float32)

    for end_idx in range(cycle_count):
        start_idx = max(0, end_idx - window_size + 1)
        segment = values[start_idx : end_idx + 1]
        windows[end_idx, window_size - len(segment) :] = segment

    window_targets = None
    if targets is not None:
        window_targets = targets.astype(np.float32)

    engine_ids = np.full(cycle_count, engine_id, dtype=np.int64)
    end_cycles = cycles.astype(np.int64)
    return windows, window_targets, engine_ids, end_cycles


def create_sequence_windows(
    frame: pd.DataFrame,
    feature_columns: list[str],
    window_size: int = DEFAULT_SEQUENCE_WINDOW_SIZE,
    *,
    engine_col: str = ENGINE_COL,
    cycle_col: str = CYCLE_COL,
    target_col: str = "rul",
    pad_value: float = 0.0,
) -> SequenceWindowBatch:
    """
    Build sliding windows per engine with left-padding for short histories.

    Each sample uses cycles up to and including the window end. The target is
    the RUL at that final cycle when labels are present.
    """
    if window_size <= 0:
        raise ValueError("window_size must be positive")

    if not feature_columns:
        raise ValueError("feature_columns must not be empty")

    required = {engine_col, cycle_col, *feature_columns}
    missing = required - set(frame.columns)
    if missing:
        raise ValueError(f"Input frame missing columns: {sorted(missing)}")

    include_targets = target_col in frame.columns

    sorted_frame = frame.sort_values([engine_col, cycle_col])

    feature_batches: list[np.ndarray] = []
    target_batches: list[np.ndarray] = []
    engine_batches: list[np.ndarray] = []
    cycle_batches: list[np.ndarray] = []

    for engine_id, group in sorted_frame.groupby(engine_col, sort=False):
        values = group[feature_columns].to_numpy(dtype=np.float32)
        cycles = group[cycle_col].to_numpy()
        targets = group[target_col].to_numpy(dtype=np.float32) if include_targets else None

        windows, window_targets, engine_ids, end_cycles = _windows_for_engine(
            values=values,
            targets=targets,
            engine_id=int(engine_id),
            cycles=cycles,
            window_size=window_size,
            pad_value=pad_value,
        )
        feature_batches.append(windows)
        engine_batches.append(engine_ids)
        cycle_batches.append(end_cycles)
        if window_targets is not None:
            target_batches.append(window_targets)

    features = np.concatenate(feature_batches, axis=0)
    engine_ids = np.concatenate(engine_batches, axis=0)
    end_cycles = np.concatenate(cycle_batches, axis=0)
    targets = np.concatenate(target_batches, axis=0) if target_batches else None

    return SequenceWindowBatch(
        features=features,
        targets=targets,
        engine_ids=engine_ids,
        end_cycles=end_cycles,
    )
