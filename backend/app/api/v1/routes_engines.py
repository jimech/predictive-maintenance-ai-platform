from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.schemas.engine import EngineDetailResponse, SensorHistoryResponse
from app.services import mock_store

router = APIRouter(prefix="/engines", tags=["engines"])


@router.get("/{engine_id}", response_model=EngineDetailResponse)
def get_engine(engine_id: str) -> EngineDetailResponse:
    return mock_store.get_engine(engine_id)


@router.get("/{engine_id}/sensors", response_model=SensorHistoryResponse)
def get_engine_sensors(
    engine_id: str,
    from_cycle: Optional[int] = Query(default=None),
    to_cycle: Optional[int] = Query(default=None),
) -> SensorHistoryResponse:
    return mock_store.get_sensor_history(engine_id, from_cycle=from_cycle, to_cycle=to_cycle)
