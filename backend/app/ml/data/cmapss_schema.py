"""C-MAPSS FD001 column schema (docs/ML_PIPELINE.md)."""

from __future__ import annotations

CMAPSS_DATASET_NAME = "FD001"
CMAPSS_COLUMN_COUNT = 26

CMAPSS_COLUMNS: list[str] = (
    ["engine_id", "cycle", "op_setting_1", "op_setting_2", "op_setting_3"]
    + [f"sensor_{i}" for i in range(1, 22)]
)

CMAPSS_TRAIN_FILENAME = "train_FD001.txt"
CMAPSS_TEST_FILENAME = "test_FD001.txt"
CMAPSS_RUL_FILENAME = "RUL_FD001.txt"
