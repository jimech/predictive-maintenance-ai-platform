from fastapi import APIRouter

from app.api.v1 import routes_alerts, routes_engines, routes_fleet, routes_models

router = APIRouter()

router.include_router(routes_fleet.router)
router.include_router(routes_engines.router)
router.include_router(routes_alerts.router)
router.include_router(routes_models.router)


@router.get("/")
def api_v1_root() -> dict[str, str]:
    return {"message": "Predictive Maintenance API v1"}
