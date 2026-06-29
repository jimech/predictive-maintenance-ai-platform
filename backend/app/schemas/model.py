from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ModelItem(BaseModel):
    id: str
    model_name: str
    model_type: str
    dataset_name: str
    mae: float
    rmse: float
    nasa_score: Optional[float]
    is_production: bool
    created_at: datetime


class ModelsResponse(BaseModel):
    models: list[ModelItem]
