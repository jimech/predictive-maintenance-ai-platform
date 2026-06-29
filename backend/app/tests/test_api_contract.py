import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import mock_store


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_engine_id() -> str:
    return next(iter(mock_store.mock_store.engines.keys()))


@pytest.fixture
def sample_alert_id() -> str:
    return next(iter(mock_store.mock_store.alerts.keys()))


@pytest.mark.asyncio
async def test_fleet_endpoint(client):
    response = await client.get("/api/v1/fleet")
    assert response.status_code == 200
    payload = response.json()
    assert "engines" in payload
    assert len(payload["engines"]) >= 1
    engine = payload["engines"][0]
    assert {"engine_id", "external_engine_id", "latest_cycle", "estimated_rul", "risk_category"} <= engine.keys()


@pytest.mark.asyncio
async def test_engine_detail_endpoint(client, sample_engine_id):
    response = await client.get(f"/api/v1/engines/{sample_engine_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["engine_id"] == sample_engine_id
    assert "latest_prediction" in payload
    assert "recommendation" in payload


@pytest.mark.asyncio
async def test_engine_sensors_endpoint(client, sample_engine_id):
    response = await client.get(f"/api/v1/engines/{sample_engine_id}/sensors")
    assert response.status_code == 200
    payload = response.json()
    assert payload["engine_id"] == sample_engine_id
    assert len(payload["cycles"]) >= 1
    assert "sensor_1" in payload["series"]


@pytest.mark.asyncio
async def test_alerts_endpoint(client):
    response = await client.get("/api/v1/alerts")
    assert response.status_code == 200
    payload = response.json()
    assert "alerts" in payload
    assert len(payload["alerts"]) >= 1


@pytest.mark.asyncio
async def test_acknowledge_alert(client, sample_alert_id):
    response = await client.post(f"/api/v1/alerts/{sample_alert_id}/acknowledge")
    assert response.status_code == 200
    assert response.json() == {"status": "acknowledged"}


@pytest.mark.asyncio
async def test_resolve_alert(client, sample_alert_id):
    response = await client.post(f"/api/v1/alerts/{sample_alert_id}/resolve")
    assert response.status_code == 200
    assert response.json() == {"status": "resolved"}


@pytest.mark.asyncio
async def test_models_endpoint(client):
    response = await client.get("/api/v1/models")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["models"]) >= 1
    assert payload["models"][0]["dataset_name"] == "FD001"


@pytest.mark.asyncio
async def test_engine_not_found(client):
    response = await client.get("/api/v1/engines/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
