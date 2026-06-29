from __future__ import annotations

from collections.abc import Generator
from typing import Optional
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


@lru_cache
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        settings.sqlalchemy_database_url,
        pool_pre_ping=True,
        future=True,
    )


@lru_cache
def get_test_engine() -> Engine:
    settings = get_settings()
    return create_engine(
        settings.sqlalchemy_test_database_url,
        pool_pre_ping=True,
        future=True,
    )


def get_session_factory(engine: Optional[Engine] = None) -> sessionmaker[Session]:
    bind = engine or get_engine()
    return sessionmaker(bind=bind, autocommit=False, autoflush=False, expire_on_commit=False)


SessionLocal = get_session_factory()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_health(engine: Optional[Engine] = None) -> str:
    bind = engine or get_engine()
    try:
        with bind.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "ok"
    except Exception:
        logger.exception("Database health check failed")
        return "error"


def clear_engine_cache() -> None:
    get_engine.cache_clear()
    get_test_engine.cache_clear()
