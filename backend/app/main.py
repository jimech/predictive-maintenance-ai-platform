from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.session import check_database_health

settings = get_settings()
configure_logging(debug=settings.debug)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Starting %s (debug=%s)", settings.app_name, settings.debug)
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Predictive Maintenance API",
        "health": "/health",
        "ready": "/ready",
        "api_v1": settings.api_v1_prefix,
        "docs": "/docs",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    db_status = check_database_health()
    return {
        "status": "ready" if db_status == "ok" else "not_ready",
        "database": db_status,
        "model": "not_loaded",
    }


app.include_router(v1_router, prefix=settings.api_v1_prefix)
