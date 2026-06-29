from fastapi import APIRouter

from app.schemas.model import ModelsResponse
from app.services import mock_store

router = APIRouter(tags=["models"])


@router.get("/models", response_model=ModelsResponse)
def list_models() -> ModelsResponse:
    return mock_store.get_models()
