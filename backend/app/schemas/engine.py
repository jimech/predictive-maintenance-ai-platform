from __future__ import annotations

from app.schemas.fleet import PredictionSummary
from pydantic import BaseModel


class EngineDetailResponse(BaseModel):
    engine_id: str
    external_engine_id: int
    status: str
    latest_cycle: int
    latest_prediction: PredictionSummary
    recommendation: str
    open_alerts: int


class SensorHistoryResponse(BaseModel):
    engine_id: str
    cycles: list[int]
    series: dict[str, list[float]]
