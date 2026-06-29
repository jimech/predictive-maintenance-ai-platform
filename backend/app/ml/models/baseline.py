"""Random Forest baseline model for tabular RUL prediction (Ticket 3.1)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from app.ml.features.scalers import TabularFeaturePipeline


@dataclass(frozen=True)
class BaselineModelArtifacts:
    model_path: Path
    metadata_path: Path
    feature_pipeline_dir: Path


class BaselineRULModel:
    """Random Forest regressor with tabular feature pipeline."""

    def __init__(
        self,
        model: Optional[RandomForestRegressor] = None,
        feature_pipeline: Optional[TabularFeaturePipeline] = None,
    ) -> None:
        self.model = model
        self.feature_pipeline = feature_pipeline

    def fit(
        self,
        train_frame: pd.DataFrame,
        feature_pipeline: Optional[TabularFeaturePipeline] = None,
        **model_params: Any,
    ) -> "BaselineRULModel":
        pipeline = feature_pipeline or TabularFeaturePipeline()
        scaled = pipeline.fit_transform(train_frame)

        if "rul" not in scaled.columns:
            raise ValueError("Training frame must include rul labels")

        features = scaled[pipeline.feature_columns].to_numpy(dtype=float)
        targets = scaled["rul"].to_numpy(dtype=float)

        params = {
            "n_estimators": 100,
            "random_state": 42,
            "n_jobs": -1,
            **model_params,
        }
        regressor = RandomForestRegressor(**params)
        regressor.fit(features, targets)

        self.model = regressor
        self.feature_pipeline = pipeline
        return self

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        if self.model is None or self.feature_pipeline is None:
            raise RuntimeError("Model must be fitted or loaded before predict")

        scaled = self.feature_pipeline.transform(frame)
        features = scaled[self.feature_pipeline.feature_columns].to_numpy(dtype=float)
        return self.model.predict(features)

    def save(self, artifact_dir: Path, model_name: str = "baseline") -> BaselineModelArtifacts:
        if self.model is None or self.feature_pipeline is None:
            raise RuntimeError("Model must be fitted before save")

        root = Path(artifact_dir)
        model_dir = root / "models" / model_name
        model_dir.mkdir(parents=True, exist_ok=True)

        model_path = model_dir / "model.joblib"
        metadata_path = model_dir / "metadata.json"

        joblib.dump(self.model, model_path)
        feature_artifacts = self.feature_pipeline.save(root)

        metadata = {
            "model_type": "random_forest",
            "model_name": model_name,
            "feature_columns": feature_artifacts.feature_columns,
            "feature_pipeline_dir": str(root),
        }
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        return BaselineModelArtifacts(
            model_path=model_path,
            metadata_path=metadata_path,
            feature_pipeline_dir=root,
        )

    @classmethod
    def load(cls, artifact_dir: Path, model_name: str = "baseline") -> "BaselineRULModel":
        root = Path(artifact_dir)
        model_dir = root / "models" / model_name
        model_path = model_dir / "model.joblib"
        metadata_path = model_dir / "metadata.json"

        if not model_path.exists() or not metadata_path.exists():
            raise FileNotFoundError(f"Baseline model artifacts not found in {model_dir}")

        model = joblib.load(model_path)
        feature_pipeline = TabularFeaturePipeline.load(root)
        return cls(model=model, feature_pipeline=feature_pipeline)
