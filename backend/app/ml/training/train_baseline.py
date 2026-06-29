"""Train Random Forest baseline and log to MLflow (Ticket 3.1)."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import mlflow
import pandas as pd

from app.core.config import get_settings
from app.ml.data.cmapss_schema import CMAPSS_DATASET_NAME
from app.ml.data.ingest_cmapss import load_fd001
from app.ml.data.rul_labels import DEFAULT_RUL_CAP, compute_training_rul_labels
from app.ml.models.baseline import BaselineRULModel
from app.ml.training.evaluate import compute_regression_metrics
from app.ml.training.splits import split_by_engine


@dataclass(frozen=True)
class BaselineTrainingResult:
    run_id: str
    artifact_dir: Path
    metrics: dict[str, float]
    model_path: Path


def train_baseline_model(
    train_frame: pd.DataFrame,
    artifact_dir: Path,
    *,
    val_frame: Optional[pd.DataFrame] = None,
    val_ratio: float = 0.2,
    random_state: int = 42,
    rul_cap: int = DEFAULT_RUL_CAP,
    dataset_name: str = CMAPSS_DATASET_NAME,
    experiment_name: str = "rul-baseline",
    run_name: str = "random-forest-baseline",
    tracking_uri: Optional[str] = None,
    log_to_mlflow: bool = True,
    model_params: Optional[dict[str, Any]] = None,
) -> BaselineTrainingResult:
    """Train baseline model, evaluate, save artifacts, and log to MLflow."""
    if val_frame is None:
        train_split, val_split = split_by_engine(
            train_frame,
            val_ratio=val_ratio,
            random_state=random_state,
        )
    else:
        train_split = train_frame.copy()
        val_split = val_frame.copy()

    params = {
        "model_type": "random_forest",
        "dataset_name": dataset_name,
        "rul_cap": rul_cap,
        "val_ratio": val_ratio,
        "random_state": random_state,
        "n_estimators": 100,
        **(model_params or {}),
    }

    resolved_tracking_uri = tracking_uri or get_settings().mlflow_tracking_uri
    artifact_root = Path(artifact_dir)
    artifact_root.mkdir(parents=True, exist_ok=True)

    def _run_training(run_id: str = "") -> BaselineTrainingResult:
        model = BaselineRULModel().fit(
            train_split,
            n_estimators=int(params["n_estimators"]),
            random_state=int(params["random_state"]),
        )

        train_predictions = model.predict(train_split)
        val_predictions = model.predict(val_split)

        train_metrics = compute_regression_metrics(train_split["rul"].to_numpy(), train_predictions)
        val_metrics = compute_regression_metrics(val_split["rul"].to_numpy(), val_predictions)

        metrics = {
            "train_mae": train_metrics["mae"],
            "train_rmse": train_metrics["rmse"],
            "val_mae": val_metrics["mae"],
            "val_rmse": val_metrics["rmse"],
        }

        artifacts = model.save(artifact_root)

        summary_path = artifact_root / "models" / "baseline" / "training_summary.json"
        summary_path.write_text(
            json.dumps({"metrics": metrics, "params": params}, indent=2),
            encoding="utf-8",
        )

        if log_to_mlflow:
            mlflow.log_metrics(metrics)
            mlflow.log_artifact(str(artifacts.model_path), artifact_path="model")
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
            mlflow.sklearn.log_model(model.model, artifact_path="sklearn-model")

        return BaselineTrainingResult(
            run_id=run_id,
            artifact_dir=artifact_root,
            metrics=metrics,
            model_path=artifacts.model_path,
        )

    if log_to_mlflow:
        mlflow.set_tracking_uri(resolved_tracking_uri)
        mlflow.set_experiment(experiment_name)
        with mlflow.start_run(run_name=run_name) as run:
            mlflow.log_params({key: str(value) for key, value in params.items()})
            return _run_training(run_id=run.info.run_id)

    return _run_training()


def train_baseline_from_cmapss(
    data_dir: Path,
    artifact_dir: Path,
    **kwargs: Any,
) -> BaselineTrainingResult:
    """Load FD001, label RUL, and train the baseline model."""
    dataset = load_fd001(data_dir)
    labeled = compute_training_rul_labels(dataset.train, cap=kwargs.pop("rul_cap", DEFAULT_RUL_CAP))
    return train_baseline_model(labeled, artifact_dir, dataset_name=CMAPSS_DATASET_NAME, **kwargs)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train Random Forest RUL baseline")
    parser.add_argument("--data-dir", type=Path, required=True, help="Directory with C-MAPSS FD001 files")
    parser.add_argument("--artifact-dir", type=Path, required=True, help="Directory for model artifacts")
    parser.add_argument("--tracking-uri", type=str, default=None, help="MLflow tracking URI")
    parser.add_argument("--experiment-name", type=str, default="rul-baseline")
    parser.add_argument("--run-name", type=str, default="random-forest-baseline")
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--rul-cap", type=int, default=DEFAULT_RUL_CAP)
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--no-mlflow", action="store_true", help="Skip MLflow logging")
    return parser


def main(argv: Optional[list[str]] = None) -> BaselineTrainingResult:
    parser = _build_parser()
    args = parser.parse_args(argv)

    return train_baseline_from_cmapss(
        data_dir=args.data_dir,
        artifact_dir=args.artifact_dir,
        tracking_uri=args.tracking_uri,
        experiment_name=args.experiment_name,
        run_name=args.run_name,
        val_ratio=args.val_ratio,
        random_state=args.random_state,
        rul_cap=args.rul_cap,
        log_to_mlflow=not args.no_mlflow,
        model_params={"n_estimators": args.n_estimators},
    )


if __name__ == "__main__":
    result = main()
    print(json.dumps({"run_id": result.run_id, "metrics": result.metrics, "model_path": str(result.model_path)}, indent=2))
