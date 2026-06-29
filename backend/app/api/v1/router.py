from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def api_v1_root() -> dict[str, str]:
    return {"message": "Predictive Maintenance API v1"}
