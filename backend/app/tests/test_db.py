import uuid

from app.db.models import Engine, User


def test_user_model_persists(db_session):
    user = User(
        auth_provider_id="auth0|test-user",
        email="test@example.com",
        full_name="Test User",
        role="operator",
    )
    db_session.add(user)
    db_session.flush()

    assert user.id is not None
    assert isinstance(user.id, uuid.UUID)


def test_engine_model_persists(db_session):
    engine = Engine(external_engine_id=1, dataset_name="FD001", status="active")
    db_session.add(engine)
    db_session.flush()

    assert engine.id is not None


def test_all_tables_registered():
    from app.db.base import Base
    from app.db import models  # noqa: F401

    assert set(Base.metadata.tables.keys()) == {
        "users",
        "engines",
        "sensor_readings",
        "model_runs",
        "predictions",
        "alerts",
    }
