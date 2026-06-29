from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RiskCategory = Literal["healthy", "watch", "warning", "critical"]


class PredictionSummary(BaseModel):
    estimated_rul: float
    lower_ci: float
    upper_ci: float
    health_score: float
    failure_probability: float
    risk_category: RiskCategory


class FleetEngine(BaseModel):
    engine_id: str
    external_engine_id: int
    latest_cycle: int
    estimated_rul: float
    lower_ci: float
    upper_ci: float
    health_score: float
    failure_probability: float
    risk_category: RiskCategory
    open_alerts: int


class FleetResponse(BaseModel):
    engines: list[FleetEngine]
