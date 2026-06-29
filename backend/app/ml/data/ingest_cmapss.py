"""Load and validate NASA C-MAPSS FD001 raw files (Ticket 2.1)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import pandas as pd

from app.ml.data.cmapss_schema import (
    CMAPSS_COLUMNS,
    CMAPSS_COLUMN_COUNT,
    CMAPSS_DATASET_NAME,
    CMAPSS_RUL_FILENAME,
    CMAPSS_TEST_FILENAME,
    CMAPSS_TRAIN_FILENAME,
)


class CmapssLoadError(ValueError):
    """Raised when C-MAPSS files are missing or invalid."""


@dataclass(frozen=True)
class CmapssDataset:
    dataset_name: str
    train: pd.DataFrame
    test: pd.DataFrame
    rul: pd.DataFrame


def _read_space_separated_file(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise CmapssLoadError(f"File not found: {path}")
    if not path.is_file():
        raise CmapssLoadError(f"Expected a file, got: {path}")

    try:
        frame = pd.read_csv(path, sep=r"\s+", header=None, engine="python")
    except Exception as exc:  # pragma: no cover - pandas parse errors
        raise CmapssLoadError(f"Failed to parse {path}: {exc}") from exc

    if frame.empty:
        raise CmapssLoadError(f"File is empty: {path}")
    if frame.shape[1] != CMAPSS_COLUMN_COUNT:
        raise CmapssLoadError(
            f"Expected {CMAPSS_COLUMN_COUNT} columns in {path.name}, found {frame.shape[1]}"
        )

    frame.columns = CMAPSS_COLUMNS
    return _validate_sensor_frame(frame, path)


def _validate_sensor_frame(frame: pd.DataFrame, path: Path) -> pd.DataFrame:
    numeric_columns = CMAPSS_COLUMNS
    for column in numeric_columns:
        if column not in frame.columns:
            raise CmapssLoadError(f"Missing expected column '{column}' in {path.name}")
        if not pd.api.types.is_numeric_dtype(frame[column]):
            raise CmapssLoadError(f"Column '{column}' must be numeric in {path.name}")

    if (frame["cycle"] <= 0).any():
        raise CmapssLoadError(f"Cycle values must be positive in {path.name}")

    if frame["engine_id"].isna().any():
        raise CmapssLoadError(f"Engine IDs must not be null in {path.name}")

    return frame


def load_rul_file(path: Path, test_engine_count: Optional[int] = None) -> pd.DataFrame:
    if not path.exists():
        raise CmapssLoadError(f"File not found: {path}")

    try:
        values = pd.read_csv(path, sep=r"\s+", header=None, engine="python")
    except Exception as exc:  # pragma: no cover
        raise CmapssLoadError(f"Failed to parse {path}: {exc}") from exc

    if values.empty:
        raise CmapssLoadError(f"File is empty: {path}")
    if values.shape[1] != 1:
        raise CmapssLoadError(f"Expected 1 column in {path.name}, found {values.shape[1]}")

    rul = values.iloc[:, 0].astype(float)
    if (rul < 0).any():
        raise CmapssLoadError(f"RUL values must be non-negative in {path.name}")

    frame = pd.DataFrame(
        {
            "engine_id": range(1, len(rul) + 1),
            "rul_at_last_cycle": rul.to_numpy(),
        }
    )

    if test_engine_count is not None and len(frame) != test_engine_count:
        raise CmapssLoadError(
            f"RUL file has {len(frame)} rows but test data has {test_engine_count} engines"
        )

    return frame


def load_fd001(data_dir: Path) -> CmapssDataset:
    """Load FD001 train, test, and RUL files from a directory."""
    data_dir = Path(data_dir)
    if not data_dir.exists():
        raise CmapssLoadError(f"Data directory not found: {data_dir}")

    train = _read_space_separated_file(data_dir / CMAPSS_TRAIN_FILENAME)
    test = _read_space_separated_file(data_dir / CMAPSS_TEST_FILENAME)
    test_engine_ids = sorted(test["engine_id"].unique())
    rul = load_rul_file(data_dir / CMAPSS_RUL_FILENAME, test_engine_count=len(test_engine_ids))

    return CmapssDataset(dataset_name=CMAPSS_DATASET_NAME, train=train, test=test, rul=rul)


def save_raw_artifacts(dataset: CmapssDataset, artifact_dir: Path) -> dict[str, str]:
    """Persist raw loaded frames under artifact_dir/raw/<dataset_name>/."""
    output_dir = Path(artifact_dir) / "raw" / dataset.dataset_name.lower()
    output_dir.mkdir(parents=True, exist_ok=True)

    train_path = output_dir / "train.csv"
    test_path = output_dir / "test.csv"
    rul_path = output_dir / "rul.csv"
    metadata_path = output_dir / "metadata.json"

    dataset.train.to_csv(train_path, index=False)
    dataset.test.to_csv(test_path, index=False)
    dataset.rul.to_csv(rul_path, index=False)

    metadata = {
        "dataset_name": dataset.dataset_name,
        "train_rows": len(dataset.train),
        "test_rows": len(dataset.test),
        "train_engines": int(dataset.train["engine_id"].nunique()),
        "test_engines": int(dataset.test["engine_id"].nunique()),
        "columns": CMAPSS_COLUMNS,
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return {
        "train": str(train_path),
        "test": str(test_path),
        "rul": str(rul_path),
        "metadata": str(metadata_path),
    }
