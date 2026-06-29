import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.session import clear_engine_cache


@pytest.fixture(scope="session")
def test_settings():
    os.environ.setdefault(
        "TEST_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/predictive_maintenance_test",
    )
    get_settings.cache_clear()
    clear_engine_cache()
    settings = get_settings()
    yield settings
    get_settings.cache_clear()
    clear_engine_cache()


@pytest.fixture(scope="session")
def postgres_engine(test_settings):
    admin_url = test_settings.sqlalchemy_test_database_url.rsplit("/", 1)[0] + "/postgres"
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)

    db_name = test_settings.test_database_url.rsplit("/", 1)[-1]
    try:
        with admin_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL not available for tests: {exc}")

    with admin_engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": db_name},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))

    engine = create_engine(test_settings.sqlalchemy_test_database_url, pool_pre_ping=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    admin_engine.dispose()


@pytest.fixture
def db_session(postgres_engine) -> Session:
    connection = postgres_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, autocommit=False, autoflush=False)()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
