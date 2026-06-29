"""Train GRU sequence model with early stopping (Ticket 3.2)."""

from __future__ import annotations

import argparse
import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import mlflow
import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader

from app.core.config import get_settings
from app.ml.data.cmapss_schema import CMAPSS_DATASET_NAME
from app.ml.data.ingest_cmapss import load_fd001
from app.ml.data.rul_labels import DEFAULT_RUL_CAP, compute_training_rul_labels
from app.ml.features.scalers import TabularFeaturePipeline
from app.ml.features.sequence_windows import DEFAULT_SEQUENCE_WINDOW_SIZE, create_sequence_windows
from app.ml.models.lstm import (
    GRURULRegressor,
    SequenceModelConfig,
    SequenceRULDataset,
    SequenceRULModel,
)
from app.ml.training.evaluate import compute_regression_metrics
from app.ml.training.splits import split_by_engine


@dataclass
class EarlyStoppingState:
    best_loss: float = float("inf")
    patience_counter: int = 0
    best_state_dict: Optional[dict[str, torch.Tensor]] = None


@dataclass(frozen=True)
class SequenceTrainingResult:
    run_id: str
    artifact_dir: Path
    metrics: dict[str, float]
    checkpoint_path: Path
    epochs_trained: int


def _run_epoch(
    model: GRURULRegressor,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    optimizer: Optional[torch.optim.Optimizer] = None,
) -> tuple[float, np.ndarray, np.ndarray]:
    training = optimizer is not None
    model.train(training)

    losses: list[float] = []
    predictions: list[np.ndarray] = []
    targets: list[np.ndarray] = []

    for features, batch_targets in loader:
        features = features.to(device)
        batch_targets = batch_targets.to(device)

        if training:
            optimizer.zero_grad()
            outputs = model(features)
            loss = criterion(outputs, batch_targets)
            loss.backward()
            optimizer.step()
        else:
            with torch.no_grad():
                outputs = model(features)
                loss = criterion(outputs, batch_targets)

        losses.append(float(loss.item()))
        predictions.append(outputs.detach().cpu().numpy())
        targets.append(batch_targets.detach().cpu().numpy())

    return float(np.mean(losses)), np.concatenate(predictions), np.concatenate(targets)


def _prepare_sequence_batch(
    frame: pd.DataFrame,
    feature_pipeline: TabularFeaturePipeline,
    window_size: int,
) -> SequenceRULDataset:
    scaled = feature_pipeline.transform(frame)
    batch = create_sequence_windows(
        scaled,
        feature_columns=feature_pipeline.feature_columns,
        window_size=window_size,
    )
    if batch.targets is None:
        raise ValueError("Training and validation frames must include rul labels")
    return SequenceRULDataset(batch.features, batch.targets)


def train_sequence_model(
    train_frame: pd.DataFrame,
    artifact_dir: Path,
    *,
    val_frame: Optional[pd.DataFrame] = None,
    val_ratio: float = 0.2,
    random_state: int = 42,
    rul_cap: int = DEFAULT_RUL_CAP,
    window_size: int = DEFAULT_SEQUENCE_WINDOW_SIZE,
    dataset_name: str = CMAPSS_DATASET_NAME,
    experiment_name: str = "rul-sequence",
    run_name: str = "gru-sequence",
    tracking_uri: Optional[str] = None,
    log_to_mlflow: bool = True,
    max_epochs: int = 50,
    batch_size: int = 64,
    learning_rate: float = 1e-3,
    hidden_size: int = 64,
    num_layers: int = 2,
    dropout: float = 0.1,
    patience: int = 5,
    device: Optional[str] = None,
) -> SequenceTrainingResult:
    """Train GRU sequence model, save best checkpoint, and log to MLflow."""
    if val_frame is None:
        train_split, val_split = split_by_engine(
            train_frame,
            val_ratio=val_ratio,
            random_state=random_state,
        )
    else:
        train_split = train_frame.copy()
        val_split = val_frame.copy()

    train_device = torch.device(device or "cpu")
    feature_pipeline = TabularFeaturePipeline().fit(train_split)

    train_dataset = _prepare_sequence_batch(train_split, feature_pipeline, window_size)
    val_dataset = _prepare_sequence_batch(val_split, feature_pipeline, window_size)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    input_size = len(feature_pipeline.feature_columns)
    model = GRURULRegressor(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers,
        dropout=dropout,
    ).to(train_device)

    config = SequenceModelConfig(
        model_type="gru",
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=num_layers,
        dropout=dropout,
        window_size=window_size,
        feature_columns=list(feature_pipeline.feature_columns),
    )

    params = {
        "model_type": "gru",
        "dataset_name": dataset_name,
        "rul_cap": rul_cap,
        "val_ratio": val_ratio,
        "random_state": random_state,
        "window_size": window_size,
        "max_epochs": max_epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "hidden_size": hidden_size,
        "num_layers": num_layers,
        "dropout": dropout,
        "patience": patience,
        "device": str(train_device),
    }

    artifact_root = Path(artifact_dir)
    artifact_root.mkdir(parents=True, exist_ok=True)
    resolved_tracking_uri = tracking_uri or get_settings().mlflow_tracking_uri

    def _run_training(run_id: str = "") -> SequenceTrainingResult:
        criterion = nn.L1Loss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
        early_stopping = EarlyStoppingState()
        epochs_trained = 0

        for epoch in range(1, max_epochs + 1):
            epochs_trained = epoch
            _run_epoch(model, train_loader, criterion, train_device, optimizer=optimizer)
            val_loss, val_predictions, val_targets = _run_epoch(
                model,
                val_loader,
                criterion,
                train_device,
            )

            if log_to_mlflow:
                mlflow.log_metric("val_loss", val_loss, step=epoch)

            if val_loss + 1e-6 < early_stopping.best_loss:
                early_stopping.best_loss = val_loss
                early_stopping.patience_counter = 0
                early_stopping.best_state_dict = copy.deepcopy(model.state_dict())
            else:
                early_stopping.patience_counter += 1
                if early_stopping.patience_counter >= patience:
                    break

        if early_stopping.best_state_dict is None:
            early_stopping.best_state_dict = copy.deepcopy(model.state_dict())
        model.load_state_dict(early_stopping.best_state_dict)

        _, train_predictions, train_targets = _run_epoch(model, train_loader, criterion, train_device)
        _, val_predictions, val_targets = _run_epoch(model, val_loader, criterion, train_device)

        train_metrics = compute_regression_metrics(train_targets, train_predictions)
        val_metrics = compute_regression_metrics(val_targets, val_predictions)
        metrics = {
            "train_mae": train_metrics["mae"],
            "train_rmse": train_metrics["rmse"],
            "val_mae": val_metrics["mae"],
            "val_rmse": val_metrics["rmse"],
            "best_val_loss": early_stopping.best_loss,
            "epochs_trained": float(epochs_trained),
        }

        sequence_model = SequenceRULModel(
            model=model.cpu(),
            feature_pipeline=feature_pipeline,
            config=config,
        )
        artifacts = sequence_model.save(artifact_root)

        summary_path = artifact_root / "models" / "sequence" / "training_summary.json"
        summary_path.write_text(
            json.dumps({"metrics": metrics, "params": params}, indent=2),
            encoding="utf-8",
        )

        if log_to_mlflow:
            mlflow.log_metrics(metrics)
            mlflow.log_artifact(str(artifacts.checkpoint_path), artifact_path="model")
            mlflow.log_artifact(str(artifacts.metadata_path), artifact_path="model")
            mlflow.log_artifact(str(summary_path), artifact_path="model")
            mlflow.log_artifact(
                str(artifacts.feature_pipeline_dir / "features" / "tabular" / "feature_list.json"),
                artifact_path="features",
            )
            mlflow.log_artifact(
                str(artifacts.feature_pipeline_dir / "features" / "tabular" / "scaler.joblib"),
                artifact_path="features",
            )
            mlflow.pytorch.log_model(model.cpu(), artifact_path="pytorch-model")

        return SequenceTrainingResult(
            run_id=run_id,
            artifact_dir=artifact_root,
            metrics=metrics,
            checkpoint_path=artifacts.checkpoint_path,
            epochs_trained=epochs_trained,
        )

    if log_to_mlflow:
        mlflow.set_tracking_uri(resolved_tracking_uri)
        mlflow.set_experiment(experiment_name)
        with mlflow.start_run(run_name=run_name) as run:
            mlflow.log_params({key: str(value) for key, value in params.items()})
            return _run_training(run_id=run.info.run_id)

    return _run_training()


def train_sequence_from_cmapss(
    data_dir: Path,
    artifact_dir: Path,
    **kwargs: Any,
) -> SequenceTrainingResult:
    """Load FD001, label RUL, and train the sequence model."""
    dataset = load_fd001(data_dir)
    labeled = compute_training_rul_labels(dataset.train, cap=kwargs.pop("rul_cap", DEFAULT_RUL_CAP))
    return train_sequence_model(labeled, artifact_dir, dataset_name=CMAPSS_DATASET_NAME, **kwargs)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train GRU sequence RUL model")
    parser.add_argument("--data-dir", type=Path, required=True, help="Directory with C-MAPSS FD001 files")
    parser.add_argument("--artifact-dir", type=Path, required=True, help="Directory for model artifacts")
    parser.add_argument("--tracking-uri", type=str, default=None, help="MLflow tracking URI")
    parser.add_argument("--experiment-name", type=str, default="rul-sequence")
    parser.add_argument("--run-name", type=str, default="gru-sequence")
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--rul-cap", type=int, default=DEFAULT_RUL_CAP)
    parser.add_argument("--window-size", type=int, default=DEFAULT_SEQUENCE_WINDOW_SIZE)
    parser.add_argument("--max-epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--hidden-size", type=int, default=64)
    parser.add_argument("--num-layers", type=int, default=2)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--no-mlflow", action="store_true", help="Skip MLflow logging")
    return parser


def main(argv: Optional[list[str]] = None) -> SequenceTrainingResult:
    parser = _build_parser()
    args = parser.parse_args(argv)

    return train_sequence_from_cmapss(
        data_dir=args.data_dir,
        artifact_dir=args.artifact_dir,
        tracking_uri=args.tracking_uri,
        experiment_name=args.experiment_name,
        run_name=args.run_name,
        val_ratio=args.val_ratio,
        random_state=args.random_state,
        rul_cap=args.rul_cap,
        window_size=args.window_size,
        max_epochs=args.max_epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        hidden_size=args.hidden_size,
        num_layers=args.num_layers,
        dropout=args.dropout,
        patience=args.patience,
        log_to_mlflow=not args.no_mlflow,
    )


if __name__ == "__main__":
    result = main()
    print(
        json.dumps(
            {
                "run_id": result.run_id,
                "metrics": result.metrics,
                "checkpoint_path": str(result.checkpoint_path),
                "epochs_trained": result.epochs_trained,
            },
            indent=2,
        )
    )
