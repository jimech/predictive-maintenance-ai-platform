from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.alert import AlertActionResponse, AlertSeverity, AlertsResponse, AlertStatus
from app.services import mock_store

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=AlertsResponse)
def list_alerts(
    severity: Optional[AlertSeverity] = Query(default=None),
    status: Optional[AlertStatus] = Query(default=None),
    engine_id: Optional[str] = Query(default=None),
) -> AlertsResponse:
    return mock_store.get_alerts(severity=severity, status=status, engine_id=engine_id)


@router.post("/{alert_id}/acknowledge", response_model=AlertActionResponse)
def acknowledge_alert(alert_id: str) -> AlertActionResponse:
    status_value = mock_store.acknowledge_alert(alert_id)
    return AlertActionResponse(status=status_value)  # type: ignore[arg-type]


@router.post("/{alert_id}/resolve", response_model=AlertActionResponse)
def resolve_alert(alert_id: str) -> AlertActionResponse:
    status_value = mock_store.resolve_alert(alert_id)
    return AlertActionResponse(status=status_value)  # type: ignore[arg-type]
