from app.db.session import check_database_health


def test_check_database_health_with_live_postgres(postgres_engine):
    assert check_database_health(postgres_engine) == "ok"
