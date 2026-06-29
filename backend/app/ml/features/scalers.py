"""Scaler persistence for tabular features (Ticket 2.3)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler

from app.ml.features.feature_engineering import (
    ENGINE_COL,
    CYCLE_COL,
    engineer_tabular_features,
    get_model_feature_columns,
)


@dataclass
class TabularFeatureArtifacts:
    feature_columns: list[str]
    scaler_path: Path
    feature_list_path: Path


class TabularFeaturePipeline:
    """Fit feature engineering + scaler on training data; transform train/inference rows."""

    def __init__(self) -> None:
        self.scaler = StandardScaler()
        self.feature_columns: list[str] = []
        self.is_fitted = False

    def _engineer(self, frame: pd.DataFrame) -> pd.DataFrame:
        return engineer_tabular_features(frame)

    def fit(self, train_frame: pd.DataFrame) -> "TabularFeaturePipeline":
        featured = self._engineer(train_frame)
        self.feature_columns = get_model_feature_columns(featured)
        matrix = featured[self.feature_columns].to_numpy(dtype=float)
        self.scaler.fit(matrix)
        self.is_fitted = True
        return self

    def transform(self, frame: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted:
            raise RuntimeError("Pipeline must be fitted before transform")

        featured = self._engineer(frame)
        output = featured[[ENGINE_COL, CYCLE_COL]].copy()
        if "rul" in featured.columns:
            output["rul"] = featured["rul"]
        if "raw_rul" in featured.columns:
            output["raw_rul"] = featured["raw_rul"]

        matrix = self.scaler.transform(featured[self.feature_columns].to_numpy(dtype=float))
        scaled = pd.DataFrame(matrix, columns=self.feature_columns, index=featured.index)
        return pd.concat([output.reset_index(drop=True), scaled.reset_index(drop=True)], axis=1)

    def fit_transform(self, train_frame: pd.DataFrame) -> pd.DataFrame:
        self.fit(train_frame)
        return self.transform(train_frame)

    def save(self, artifact_dir: Path) -> TabularFeatureArtifacts:
        if not self.is_fitted:
            raise RuntimeError("Pipeline must be fitted before save")

        output_dir = Path(artifact_dir) / "features" / "tabular"
        output_dir.mkdir(parents=True, exist_ok=True)

        scaler_path = output_dir / "scaler.joblib"
        feature_list_path = output_dir / "feature_list.json"

        joblib.dump(self.scaler, scaler_path)
        feature_list_path.write_text(
            json.dumps({"feature_columns": self.feature_columns}, indent=2),
            encoding="utf-8",
        )

        return TabularFeatureArtifacts(
            feature_columns=list(self.feature_columns),
            scaler_path=scaler_path,
            feature_list_path=feature_list_path,
        )

    @classmethod
    def load(cls, artifact_dir: Path) -> "TabularFeaturePipeline":
        output_dir = Path(artifact_dir) / "features" / "tabular"
        scaler_path = output_dir / "scaler.joblib"
        feature_list_path = output_dir / "feature_list.json"

        if not scaler_path.exists() or not feature_list_path.exists():
            raise FileNotFoundError(f"Feature artifacts not found in {output_dir}")

        payload = json.loads(feature_list_path.read_text(encoding="utf-8"))
        pipeline = cls()
        pipeline.scaler = joblib.load(scaler_path)
        pipeline.feature_columns = list(payload["feature_columns"])
        pipeline.is_fitted = True
        return pipeline


def load_feature_list(path: Path) -> list[str]:
    payload: dict[str, Any] = json.loads(Path(path).read_text(encoding="utf-8"))
    return list(payload["feature_columns"])
