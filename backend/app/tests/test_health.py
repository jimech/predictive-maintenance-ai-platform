from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root(client):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Predictive Maintenance API",
        "health": "/health",
        "ready": "/ready",
        "api_v1": "/api/v1",
        "docs": "/docs",
    }


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ready_when_database_ok(client):
    with patch("app.main.check_database_health", return_value="ok"):
        response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "database": "ok",
        "model": "not_loaded",
    }


@pytest.mark.asyncio
async def test_ready_when_database_error(client):
    with patch("app.main.check_database_health", return_value="error"):
        response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {
        "status": "not_ready",
        "database": "error",
        "model": "not_loaded",
    }


@pytest.mark.asyncio
async def test_api_v1_root(client):
    response = await client.get("/api/v1/")
    assert response.status_code == 200
    assert response.json() == {"message": "Predictive Maintenance API v1"}
