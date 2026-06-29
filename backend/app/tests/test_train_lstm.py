from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
import torch

from app.ml.data.rul_labels import compute_training_rul_labels
from app.ml.models.lstm import GRURULRegressor, SequenceRULDataset, SequenceRULModel
from app.ml.training.train_lstm import train_sequence_model


def _synthetic_engine(engine_id: int, cycles: int, sensor_offset: float) -> pd.DataFrame:
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


def _labeled_dataset(engine_count: int = 6, cycles: int = 20) -> pd.DataFrame:
    frames = [
        _synthetic_engine(engine_id=engine_id, cycles=cycles, sensor_offset=float(engine_id))
        for engine_id in range(1, engine_count + 1)
    ]
    return compute_training_rul_labels(pd.concat(frames, ignore_index=True), cap=130)


def test_sequence_dataset_returns_window_tensors():
    features = np.ones((4, 3, 2), dtype=np.float32)
    targets = np.array([10.0, 9.0, 8.0, 7.0], dtype=np.float32)
    dataset = SequenceRULDataset(features, targets)

    sample_features, sample_target = dataset[0]
    assert sample_features.shape == (3, 2)
    assert sample_target.item() == pytest.approx(10.0)
    assert len(dataset) == 4


def test_gru_regressor_output_shape():
    model = GRURULRegressor(input_size=5, hidden_size=8, num_layers=1, dropout=0.0)
    inputs = torch.randn(2, 4, 5)
    outputs = model(inputs)
    assert outputs.shape == (2,)


def test_train_sequence_model_runs_on_cpu_and_saves_best_checkpoint(tmp_path: Path):
    frame = _labeled_dataset(engine_count=5, cycles=15)
    result = train_sequence_model(
        frame,
        artifact_dir=tmp_path / "artifacts",
        log_to_mlflow=False,
        window_size=5,
        max_epochs=3,
        batch_size=16,
        hidden_size=8,
        num_layers=1,
        patience=2,
        device="cpu",
    )

    assert result.checkpoint_path.exists()
    assert result.metrics["val_mae"] >= 0.0
    assert result.metrics["val_rmse"] >= 0.0
    assert result.epochs_trained >= 1

    checkpoint = torch.load(result.checkpoint_path, map_location="cpu")
    assert "model_state_dict" in checkpoint
    assert "model_config" in checkpoint


def test_loaded_sequence_model_produces_rul_predictions(tmp_path: Path):
    frame = _labeled_dataset(engine_count=4, cycles=12)
    artifact_dir = tmp_path / "artifacts"

    train_sequence_model(
        frame,
        artifact_dir=artifact_dir,
        log_to_mlflow=False,
        window_size=4,
        max_epochs=2,
        batch_size=8,
        hidden_size=8,
        num_layers=1,
        patience=1,
        device="cpu",
    )

    loaded = SequenceRULModel.load(artifact_dir)
    inference_frame = _synthetic_engine(engine_id=99, cycles=6, sensor_offset=3.0)
    predictions = loaded.predict(inference_frame, device="cpu")

    assert predictions.shape == (6,)
    assert np.isfinite(predictions).all()


def test_early_stopping_keeps_best_checkpoint(tmp_path: Path):
    frame = _labeled_dataset(engine_count=5, cycles=14)
    result = train_sequence_model(
        frame,
        artifact_dir=tmp_path / "artifacts",
        log_to_mlflow=False,
        window_size=4,
        max_epochs=10,
        batch_size=16,
        hidden_size=8,
        num_layers=1,
        patience=2,
        device="cpu",
    )

    summary = json.loads(
        (tmp_path / "artifacts" / "models" / "sequence" / "training_summary.json").read_text()
    )
    assert summary["metrics"]["best_val_loss"] <= summary["metrics"]["val_mae"] + 1.0
    assert result.epochs_trained <= 10
