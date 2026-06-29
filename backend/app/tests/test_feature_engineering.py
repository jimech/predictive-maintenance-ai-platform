from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.ml.features.feature_engineering import (
    BASE_FEATURE_COLUMNS,
    engineer_tabular_features,
    get_model_feature_columns,
)
from app.ml.features.scalers import TabularFeaturePipeline, load_feature_list


def _synthetic_engine_frame(
    engine_id: int,
    cycles: int,
    sensor_offset: float = 0.0,
) -> pd.DataFrame:
    rows: dict[str, list[float]] = {
        "engine_id": [engine_id] * cycles,
        "cycle": list(range(1, cycles + 1)),
        "op_setting_1": [0.1] * cycles,
        "op_setting_2": [0.2] * cycles,
        "op_setting_3": [100.0] * cycles,
    }
    for index in range(1, 22):
        rows[f"sensor_{index}"] = [
            float(cycle + sensor_offset + index) for cycle in range(1, cycles + 1)
        ]
    return pd.DataFrame(rows)


def _multi_engine_frame() -> pd.DataFrame:
    return pd.concat(
        [
            _synthetic_engine_frame(engine_id=1, cycles=25, sensor_offset=0.0),
            _synthetic_engine_frame(engine_id=2, cycles=18, sensor_offset=10.0),
        ],
        ignore_index=True,
    )


def test_engineered_features_include_expected_groups():
    frame = _multi_engine_frame()
    featured = engineer_tabular_features(frame)
    feature_names = get_model_feature_columns(featured)

    assert "normalized_cycle_ratio" in feature_names
    assert any(name.startswith("delta_sensor_1") for name in feature_names)
    assert any(name.startswith("roll_mean_5_") for name in feature_names)
    assert any(name.startswith("roll_std_20_") for name in feature_names)
    assert any(name.startswith("slope_10_") for name in feature_names)
    assert len(feature_names) == len(set(feature_names))
    assert len(feature_names) == len(BASE_FEATURE_COLUMNS) * (
        1 + 1 + len((5, 10, 20)) * 2 + len((5, 10, 20))
    ) + 1


def test_no_future_leakage_changing_future_cycles_does_not_change_past_features():
    full = _synthetic_engine_frame(engine_id=1, cycles=12)
    truncated = full[full["cycle"] <= 6].copy()
    altered = full.copy()
    for column in BASE_FEATURE_COLUMNS:
        altered.loc[altered["cycle"] > 6, column] = altered.loc[altered["cycle"] > 6, column] * 99.0

    baseline = engineer_tabular_features(truncated)
    from_full = engineer_tabular_features(altered)
    from_full_early = from_full[from_full["cycle"] <= 6].reset_index(drop=True)
    baseline = baseline.reset_index(drop=True)

    feature_names = get_model_feature_columns(baseline)
    pd.testing.assert_frame_equal(
        baseline[feature_names],
        from_full_early[feature_names],
        check_dtype=False,
        rtol=1e-9,
        atol=1e-9,
    )


def test_delta_and_rolling_use_only_past_cycles():
    frame = _synthetic_engine_frame(engine_id=1, cycles=5)
    featured = engineer_tabular_features(frame)

    assert featured.loc[featured["cycle"] == 1, "delta_sensor_1"].iloc[0] == 0.0
    assert featured.loc[featured["cycle"] == 2, "delta_sensor_1"].iloc[0] == pytest.approx(1.0)
    assert featured.loc[featured["cycle"] == 3, "roll_mean_5_sensor_1"].iloc[0] == pytest.approx(3.0)


def test_pipeline_fit_transform_train_and_inference():
    train = _multi_engine_frame()
    inference = _synthetic_engine_frame(engine_id=3, cycles=8, sensor_offset=3.0)

    pipeline = TabularFeaturePipeline()
    train_scaled = pipeline.fit_transform(train)
    inference_scaled = pipeline.transform(inference)

    feature_names = pipeline.feature_columns
    assert list(train_scaled.columns[:2]) == ["engine_id", "cycle"]
    assert feature_names[0] in train_scaled.columns
    assert train_scaled[feature_names].mean().abs().max() < 1.0
    assert len(inference_scaled) == len(inference)
    assert not inference_scaled[feature_names].isna().any().any()


def test_pipeline_saves_scaler_and_feature_list_json(tmp_path: Path):
    train = _multi_engine_frame()
    pipeline = TabularFeaturePipeline().fit(train)
    artifacts = pipeline.save(tmp_path)

    assert artifacts.scaler_path.exists()
    assert artifacts.feature_list_path.exists()

    payload = json.loads(artifacts.feature_list_path.read_text(encoding="utf-8"))
    assert payload["feature_columns"] == pipeline.feature_columns
    assert load_feature_list(artifacts.feature_list_path) == pipeline.feature_columns

    reloaded = TabularFeaturePipeline.load(tmp_path)
    original = pipeline.transform(train)
    restored = reloaded.transform(train)
    feature_names = pipeline.feature_columns
    np.testing.assert_allclose(
        original[feature_names].to_numpy(),
        restored[feature_names].to_numpy(),
        rtol=1e-6,
        atol=1e-6,
    )


def test_transform_before_fit_raises():
    pipeline = TabularFeaturePipeline()
    with pytest.raises(RuntimeError, match="fitted"):
        pipeline.transform(_multi_engine_frame())
