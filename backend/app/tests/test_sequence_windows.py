from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.ml.data.rul_labels import compute_training_rul_labels
from app.ml.features.sequence_windows import create_sequence_windows


def _engine_frame(engine_id: int, cycles: int) -> pd.DataFrame:
    rows = {
        "engine_id": [engine_id] * cycles,
        "cycle": list(range(1, cycles + 1)),
        "feature_a": [float(cycle) for cycle in range(1, cycles + 1)],
        "feature_b": [float(cycle) * 10.0 for cycle in range(1, cycles + 1)],
    }
    frame = pd.DataFrame(rows)
    return compute_training_rul_labels(frame, cap=130)


def _labeled_multi_engine_frame() -> pd.DataFrame:
    return pd.concat(
        [
            _engine_frame(engine_id=1, cycles=8),
            _engine_frame(engine_id=2, cycles=5),
        ],
        ignore_index=True,
    )


def test_output_shape_is_samples_window_features():
    frame = _labeled_multi_engine_frame()
    batch = create_sequence_windows(
        frame,
        feature_columns=["feature_a", "feature_b"],
        window_size=4,
    )

    assert batch.features.shape == (13, 4, 2)
    assert batch.targets is not None
    assert batch.targets.shape == (13,)
    assert batch.engine_ids.shape == (13,)
    assert batch.end_cycles.shape == (13,)


def test_target_equals_rul_at_final_cycle_of_window():
    frame = _engine_frame(engine_id=1, cycles=6)
    window_size = 3
    batch = create_sequence_windows(
        frame,
        feature_columns=["feature_a"],
        window_size=window_size,
    )

    for index in range(batch.sample_count):
        cycle = int(batch.end_cycles[index])
        row = frame[frame["cycle"] == cycle].iloc[0]
        assert batch.targets[index] == pytest.approx(row["rul"])

        window = batch.features[index, :, 0]
        expected_cycles = list(range(max(1, cycle - window_size + 1), cycle + 1))
        pad_count = window_size - len(expected_cycles)
        expected_values = [0.0] * pad_count + [float(value) for value in expected_cycles]
        np.testing.assert_allclose(window, expected_values)


def test_multiple_engines_produce_per_engine_samples():
    frame = _labeled_multi_engine_frame()
    batch = create_sequence_windows(
        frame,
        feature_columns=["feature_a", "feature_b"],
        window_size=3,
    )

    engine_1_count = int((batch.engine_ids == 1).sum())
    engine_2_count = int((batch.engine_ids == 2).sum())
    assert engine_1_count == 8
    assert engine_2_count == 5
    assert batch.sample_count == 13


def test_short_history_is_left_padded():
    frame = _engine_frame(engine_id=3, cycles=2)
    batch = create_sequence_windows(
        frame,
        feature_columns=["feature_a"],
        window_size=5,
    )

    assert batch.features.shape == (2, 5, 1)
    np.testing.assert_allclose(
        batch.features[0],
        np.array([[0.0], [0.0], [0.0], [0.0], [1.0]], dtype=np.float32),
    )
    np.testing.assert_allclose(
        batch.features[1],
        np.array([[0.0], [0.0], [0.0], [1.0], [2.0]], dtype=np.float32),
    )
    assert batch.targets[0] == pytest.approx(frame.loc[frame["cycle"] == 1, "rul"].iloc[0])
    assert batch.targets[1] == pytest.approx(frame.loc[frame["cycle"] == 2, "rul"].iloc[0])


def test_inference_mode_without_targets():
    frame = _labeled_multi_engine_frame().drop(columns=["rul", "raw_rul"])
    batch = create_sequence_windows(
        frame,
        feature_columns=["feature_a", "feature_b"],
        window_size=3,
    )

    assert batch.targets is None
    assert batch.features.shape == (13, 3, 2)


def test_invalid_window_size_raises():
    frame = _labeled_multi_engine_frame()
    with pytest.raises(ValueError, match="window_size"):
        create_sequence_windows(frame, feature_columns=["feature_a"], window_size=0)
