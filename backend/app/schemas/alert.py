from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


AlertSeverity = Literal["info", "warning", "critical"]
AlertStatus = Literal["open", "acknowledged", "resolved"]


class AlertItem(BaseModel):
    id: str
    engine_id: str
    external_engine_id: int
    severity: AlertSeverity
    title: str
    message: str
    status: AlertStatus
    created_at: datetime


class AlertsResponse(BaseModel):
    alerts: list[AlertItem]


class AlertActionResponse(BaseModel):
    status: Literal["acknowledged", "resolved"]
