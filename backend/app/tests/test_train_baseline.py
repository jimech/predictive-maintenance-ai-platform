from __future__ import annotations

import json
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd
import pytest

from app.ml.data.rul_labels import compute_training_rul_labels
from app.ml.models.baseline import BaselineRULModel
from app.ml.training.evaluate import compute_regression_metrics
from app.ml.training.splits import split_by_engine
from app.ml.training.train_baseline import train_baseline_model


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


def _labeled_dataset(engine_count: int = 6, cycles: int = 25) -> pd.DataFrame:
    frames = [
        _synthetic_engine(engine_id=engine_id, cycles=cycles, sensor_offset=float(engine_id))
        for engine_id in range(1, engine_count + 1)
    ]
    return compute_training_rul_labels(pd.concat(frames, ignore_index=True), cap=130)


def test_compute_regression_metrics():
    metrics = compute_regression_metrics(np.array([10.0, 20.0]), np.array([12.0, 18.0]))
    assert metrics["mae"] == pytest.approx(2.0)
    assert metrics["rmse"] == pytest.approx(2.0)


def test_split_by_engine_holds_out_whole_engines():
    frame = _labeled_dataset(engine_count=5, cycles=10)
    train, val = split_by_engine(frame, val_ratio=0.4, random_state=7)

    assert set(train["engine_id"]).isdisjoint(set(val["engine_id"]))
    assert len(train) + len(val) == len(frame)
    assert len(val["engine_id"].unique()) >= 1


def test_train_baseline_end_to_end(tmp_path: Path):
    frame = _labeled_dataset(engine_count=6, cycles=20)
    tracking_uri = f"file://{tmp_path / 'mlruns'}"

    result = train_baseline_model(
        frame,
        artifact_dir=tmp_path / "artifacts",
        tracking_uri=tracking_uri,
        experiment_name="test-baseline",
        run_name="unit-test-run",
        val_ratio=0.33,
        random_state=42,
        model_params={"n_estimators": 25},
    )

    assert result.model_path.exists()
    assert result.metrics["val_mae"] >= 0.0
    assert result.metrics["val_rmse"] >= 0.0
    assert (tmp_path / "artifacts" / "features" / "tabular" / "feature_list.json").exists()
    assert (tmp_path / "artifacts" / "features" / "tabular" / "scaler.joblib").exists()

    summary = json.loads((tmp_path / "artifacts" / "models" / "baseline" / "training_summary.json").read_text())
    assert "metrics" in summary
    assert summary["params"]["model_type"] == "random_forest"


def test_baseline_model_can_be_loaded_for_inference(tmp_path: Path):
    frame = _labeled_dataset(engine_count=5, cycles=15)
    artifact_dir = tmp_path / "artifacts"

    train_baseline_model(
        frame,
        artifact_dir=artifact_dir,
        log_to_mlflow=False,
        val_ratio=0.2,
        model_params={"n_estimators": 20},
    )

    loaded = BaselineRULModel.load(artifact_dir)
    inference_frame = _synthetic_engine(engine_id=99, cycles=8, sensor_offset=5.0)
    predictions = loaded.predict(inference_frame)

    assert predictions.shape == (8,)
    assert np.isfinite(predictions).all()


def test_mlflow_run_logs_parameters_metrics_and_artifacts(tmp_path: Path):
    frame = _labeled_dataset(engine_count=6, cycles=18)
    tracking_uri = f"file://{tmp_path / 'mlruns'}"

    result = train_baseline_model(
        frame,
        artifact_dir=tmp_path / "artifacts",
        tracking_uri=tracking_uri,
        experiment_name="test-baseline-mlflow",
        run_name="mlflow-audit",
        model_params={"n_estimators": 15},
    )

    mlflow.set_tracking_uri(tracking_uri)
    run = mlflow.get_run(result.run_id)
    assert run.data.params["model_type"] == "random_forest"
    assert run.data.params["dataset_name"] == "FD001"
    assert "val_mae" in run.data.metrics
    assert "val_rmse" in run.data.metrics

    client = mlflow.tracking.MlflowClient(tracking_uri=tracking_uri)
    artifact_paths: list[str] = []

    def _walk(path: str = "") -> None:
        for entry in client.list_artifacts(result.run_id, path):
            artifact_paths.append(entry.path)
            if entry.is_dir:
                _walk(entry.path)

    _walk()
    assert any(path.startswith("model/") or path == "model" for path in artifact_paths)
    assert any(path.startswith("features/") or path == "features" for path in artifact_paths)
    assert any("model.joblib" in path for path in artifact_paths)
