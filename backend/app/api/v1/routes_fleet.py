from fastapi import APIRouter

from app.schemas.fleet import FleetResponse
from app.services import mock_store

router = APIRouter(tags=["fleet"])


@router.get("/fleet", response_model=FleetResponse)
def list_fleet() -> FleetResponse:
    return mock_store.get_fleet()
