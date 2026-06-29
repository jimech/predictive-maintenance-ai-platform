"""GRU sequence regressor for RUL prediction (Ticket 3.2)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import Dataset

from app.ml.features.scalers import TabularFeaturePipeline
from app.ml.features.sequence_windows import DEFAULT_SEQUENCE_WINDOW_SIZE, create_sequence_windows


class SequenceRULDataset(Dataset):
    """PyTorch dataset wrapping sequence windows and RUL targets."""

    def __init__(self, features: np.ndarray, targets: np.ndarray) -> None:
        if len(features) != len(targets):
            raise ValueError("Features and targets must have the same number of samples")
        self.features = torch.as_tensor(features, dtype=torch.float32)
        self.targets = torch.as_tensor(targets, dtype=torch.float32)

    def __len__(self) -> int:
        return int(self.features.shape[0])

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.features[index], self.targets[index]


class GRURULRegressor(nn.Module):
    """GRU encoder with a linear head predicting RUL from the final timestep."""

    def __init__(
        self,
        input_size: int,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.head = nn.Linear(hidden_size, 1)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        outputs, _ = self.gru(inputs)
        return self.head(outputs[:, -1, :]).squeeze(-1)


@dataclass(frozen=True)
class SequenceModelArtifacts:
    checkpoint_path: Path
    metadata_path: Path
    feature_pipeline_dir: Path


@dataclass(frozen=True)
class SequenceModelConfig:
    model_type: str
    input_size: int
    hidden_size: int
    num_layers: int
    dropout: float
    window_size: int
    feature_columns: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_type": self.model_type,
            "input_size": self.input_size,
            "hidden_size": self.hidden_size,
            "num_layers": self.num_layers,
            "dropout": self.dropout,
            "window_size": self.window_size,
            "feature_columns": self.feature_columns,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SequenceModelConfig":
        return cls(
            model_type=str(payload["model_type"]),
            input_size=int(payload["input_size"]),
            hidden_size=int(payload["hidden_size"]),
            num_layers=int(payload["num_layers"]),
            dropout=float(payload["dropout"]),
            window_size=int(payload["window_size"]),
            feature_columns=list(payload["feature_columns"]),
        )


class SequenceRULModel:
    """Sequence model with feature pipeline for training and inference."""

    def __init__(
        self,
        model: Optional[GRURULRegressor] = None,
        feature_pipeline: Optional[TabularFeaturePipeline] = None,
        config: Optional[SequenceModelConfig] = None,
    ) -> None:
        self.model = model
        self.feature_pipeline = feature_pipeline
        self.config = config

    def predict(self, frame: pd.DataFrame, device: torch.device | str = "cpu") -> np.ndarray:
        if self.model is None or self.feature_pipeline is None or self.config is None:
            raise RuntimeError("Model must be loaded before predict")

        scaled = self.feature_pipeline.transform(frame)
        batch = create_sequence_windows(
            scaled,
            feature_columns=self.config.feature_columns,
            window_size=self.config.window_size,
        )

        tensor_device = torch.device(device)
        self.model.eval()
        with torch.no_grad():
            features = torch.as_tensor(batch.features, dtype=torch.float32, device=tensor_device)
            predictions = self.model(features).cpu().numpy()
        return predictions

    def save(self, artifact_dir: Path, model_name: str = "sequence") -> SequenceModelArtifacts:
        if self.model is None or self.feature_pipeline is None or self.config is None:
            raise RuntimeError("Model must be configured before save")

        root = Path(artifact_dir)
        model_dir = root / "models" / model_name
        model_dir.mkdir(parents=True, exist_ok=True)

        checkpoint_path = model_dir / "best_model.pt"
        metadata_path = model_dir / "metadata.json"

        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "model_config": self.config.to_dict(),
            },
            checkpoint_path,
        )
        feature_artifacts = self.feature_pipeline.save(root)
        metadata = {
            **self.config.to_dict(),
            "model_name": model_name,
            "feature_columns": feature_artifacts.feature_columns,
            "feature_pipeline_dir": str(root),
        }
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        return SequenceModelArtifacts(
            checkpoint_path=checkpoint_path,
            metadata_path=metadata_path,
            feature_pipeline_dir=root,
        )

    @classmethod
    def load(cls, artifact_dir: Path, model_name: str = "sequence") -> "SequenceRULModel":
        root = Path(artifact_dir)
        model_dir = root / "models" / model_name
        checkpoint_path = model_dir / "best_model.pt"
        metadata_path = model_dir / "metadata.json"

        if not checkpoint_path.exists() or not metadata_path.exists():
            raise FileNotFoundError(f"Sequence model artifacts not found in {model_dir}")

        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
        config = SequenceModelConfig.from_dict(payload)
        checkpoint = torch.load(checkpoint_path, map_location="cpu")

        model = GRURULRegressor(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            dropout=config.dropout,
        )
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()

        feature_pipeline = TabularFeaturePipeline.load(root)
        return cls(model=model, feature_pipeline=feature_pipeline, config=config)
