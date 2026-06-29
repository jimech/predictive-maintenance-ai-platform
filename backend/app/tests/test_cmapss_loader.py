from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from app.ml.data.cmapss_schema import CMAPSS_COLUMNS, CMAPSS_COLUMN_COUNT
from app.ml.data.ingest_cmapss import CmapssLoadError, load_fd001, save_raw_artifacts
from app.ml.data.rul_labels import DEFAULT_RUL_CAP, assert_training_rul_valid, compute_training_rul_labels


def _write_sensor_file(path: Path, rows: list[list[float]]) -> None:
    lines = [" ".join(str(value) for value in row) for row in rows]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


@pytest.fixture
def sample_fd001_dir(tmp_path: Path) -> Path:
    # Engine 1: cycles 1-3; Engine 2: cycles 1-2
    train_rows = []
    for cycle in (1, 2, 3):
        train_rows.append([1, cycle, 0.1, 0.2, 100.0, *list(range(21))])
    for cycle in (1, 2):
        train_rows.append([2, cycle, 0.1, 0.2, 100.0, *list(range(21))])
    _write_sensor_file(tmp_path / "train_FD001.txt", train_rows)

    test_rows = []
    for cycle in (1, 2):
        test_rows.append([1, cycle, 0.1, 0.2, 100.0, *list(range(21))])
    _write_sensor_file(tmp_path / "test_FD001.txt", test_rows)

    (tmp_path / "RUL_FD001.txt").write_text("15\n", encoding="utf-8")
    return tmp_path


def test_load_fd001_returns_expected_columns(sample_fd001_dir: Path):
    dataset = load_fd001(sample_fd001_dir)

    assert list(dataset.train.columns) == CMAPSS_COLUMNS
    assert list(dataset.test.columns) == CMAPSS_COLUMNS
    assert dataset.train.shape[1] == CMAPSS_COLUMN_COUNT
    assert len(dataset.train) == 5
    assert len(dataset.test) == 2
    assert list(dataset.rul.columns) == ["engine_id", "rul_at_last_cycle"]


def test_load_fd001_rejects_wrong_column_count(sample_fd001_dir: Path):
    bad_file = sample_fd001_dir / "train_FD001.txt"
    bad_file.write_text("1 2 3\n", encoding="utf-8")

    with pytest.raises(CmapssLoadError, match="Expected 26 columns"):
        load_fd001(sample_fd001_dir)


def test_load_fd001_rejects_missing_file(tmp_path: Path):
    with pytest.raises(CmapssLoadError, match="File not found"):
        load_fd001(tmp_path)


def test_save_raw_artifacts_writes_files(sample_fd001_dir: Path, tmp_path: Path):
    dataset = load_fd001(sample_fd001_dir)
    paths = save_raw_artifacts(dataset, tmp_path)

    assert Path(paths["train"]).exists()
    assert Path(paths["test"]).exists()
    assert Path(paths["rul"]).exists()
    assert Path(paths["metadata"]).exists()


def test_compute_training_rul_labels_last_cycle_is_zero():
    frame = pd.DataFrame(
        {
            "engine_id": [1, 1, 1, 2, 2],
            "cycle": [1, 2, 3, 1, 2],
        }
    )

    labeled = compute_training_rul_labels(frame, cap=130)

    assert list(labeled.columns[-2:]) == ["raw_rul", "rul"]
    engine_one_last = labeled[(labeled["engine_id"] == 1) & (labeled["cycle"] == 3)].iloc[0]
    assert engine_one_last["raw_rul"] == 0
    assert engine_one_last["rul"] == 0
    assert labeled.loc[labeled["engine_id"] == 1, "raw_rul"].tolist() == [2, 1, 0]


def test_compute_training_rul_labels_applies_cap():
    frame = pd.DataFrame({"engine_id": [1], "cycle": [1]})
    # max cycle = 1, raw_rul = 0 for single row - need longer engine

    long_engine = pd.DataFrame(
        {"engine_id": [1] * 200, "cycle": list(range(1, 201))}
    )
    labeled = compute_training_rul_labels(long_engine, cap=130)

    assert labeled["raw_rul"].max() == 199
    assert labeled["rul"].max() == 130
    assert (labeled["rul"] <= labeled["raw_rul"]).all()


def test_assert_training_rul_valid_passes(sample_fd001_dir: Path):
    dataset = load_fd001(sample_fd001_dir)
    labeled = compute_training_rul_labels(dataset.train, cap=DEFAULT_RUL_CAP)
    assert_training_rul_valid(labeled, cap=DEFAULT_RUL_CAP)
