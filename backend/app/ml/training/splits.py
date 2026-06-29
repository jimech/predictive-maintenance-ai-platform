"""Train/validation splits for C-MAPSS trajectories."""

from __future__ import annotations

import numpy as np
import pandas as pd


def split_by_engine(
    frame: pd.DataFrame,
    val_ratio: float = 0.2,
    random_state: int = 42,
    engine_col: str = "engine_id",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Hold out entire engines for validation to avoid temporal leakage."""
    if not 0.0 < val_ratio < 1.0:
        raise ValueError("val_ratio must be between 0 and 1")

    engines = frame[engine_col].unique()
    if len(engines) < 2:
        raise ValueError("At least two engines are required for engine-based split")

    rng = np.random.default_rng(random_state)
    shuffled = rng.permutation(engines)
    val_count = max(1, int(round(len(shuffled) * val_ratio)))
    val_engines = set(shuffled[:val_count])

    val_mask = frame[engine_col].isin(val_engines)
    train = frame.loc[~val_mask].copy()
    val = frame.loc[val_mask].copy()
    return train, val
