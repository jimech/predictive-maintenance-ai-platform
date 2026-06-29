from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from app.schemas.alert import AlertItem, AlertSeverity, AlertStatus, AlertsResponse
from app.schemas.engine import EngineDetailResponse, SensorHistoryResponse
from app.schemas.fleet import FleetEngine, FleetResponse, PredictionSummary
from app.schemas.model import ModelItem, ModelsResponse
from app.services.risk import (
    calculate_health_score,
    classify_risk,
    confidence_interval,
    failure_probability_for_risk,
    generate_recommendation,
)

ENGINE_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
ALERT_NAMESPACE = uuid.UUID("6ba7b811-9dad-11d1-80b4-00c04fd430c8")
MODEL_NAMESPACE = uuid.UUID("6ba7b812-9dad-11d1-80b4-00c04fd430c8")


@dataclass
class EngineRecord:
    engine_id: str
    external_engine_id: int
    latest_cycle: int
    estimated_rul: float
    status: str = "active"


@dataclass
class AlertRecord:
    id: str
    engine_id: str
    external_engine_id: int
    severity: AlertSeverity
    title: str
    message: str
    status: AlertStatus
    created_at: datetime


@dataclass
class ModelRecord:
    id: str
    model_name: str
    model_type: str
    dataset_name: str
    mae: float
    rmse: float
    nasa_score: Optional[float]
    is_production: bool
    created_at: datetime


@dataclass
class MockStore:
    engines: dict[str, EngineRecord] = field(default_factory=dict)
    alerts: dict[str, AlertRecord] = field(default_factory=dict)
    models: dict[str, ModelRecord] = field(default_factory=dict)


def _pseudo_random(seed: int) -> float:
    value = math.sin(seed * 12.9898) * 43758.5453
    return value - math.floor(value)


def _build_prediction(estimated_rul: float) -> PredictionSummary:
    health_score = calculate_health_score(estimated_rul)
    risk_category = classify_risk(estimated_rul, health_score)
    lower_ci, upper_ci = confidence_interval(estimated_rul)
    return PredictionSummary(
        estimated_rul=round(estimated_rul, 1),
        lower_ci=lower_ci,
        upper_ci=upper_ci,
        health_score=health_score,
        failure_probability=failure_probability_for_risk(risk_category, estimated_rul),
        risk_category=risk_category,  # type: ignore[arg-type]
    )


def _seed_engines() -> dict[str, EngineRecord]:
    engines: dict[str, EngineRecord] = {}
    for external_id in range(1, 21):
        seed = external_id * 17
        latest_cycle = 40 + int(_pseudo_random(seed) * 220)
        base_life = 300
        estimated_rul = max(5.0, base_life - latest_cycle + (_pseudo_random(seed + 3) * 30 - 15))
        engine_id = str(uuid.uuid5(ENGINE_NAMESPACE, f"engine-{external_id}"))
        engines[engine_id] = EngineRecord(
            engine_id=engine_id,
            external_engine_id=external_id,
            latest_cycle=latest_cycle,
            estimated_rul=round(estimated_rul, 1),
        )
    return engines


def _seed_alerts(engines: dict[str, EngineRecord]) -> dict[str, AlertRecord]:
    alerts: dict[str, AlertRecord] = {}
    counter = 1
    now = datetime.now(timezone.utc)

    for engine in engines.values():
        prediction = _build_prediction(engine.estimated_rul)
        if prediction.risk_category not in {"critical", "warning", "watch"}:
            continue

        severity: AlertSeverity = (
            "critical" if prediction.risk_category == "critical" else "warning"
            if prediction.risk_category == "warning"
            else "info"
        )
        alert_id = str(uuid.uuid5(ALERT_NAMESPACE, f"alert-{counter}"))
        alerts[alert_id] = AlertRecord(
            id=alert_id,
            engine_id=engine.engine_id,
            external_engine_id=engine.external_engine_id,
            severity=severity,
            title=f"{severity.title()} failure risk",
            message=(
                f"Engine {engine.external_engine_id} has estimated RUL of "
                f"{prediction.estimated_rul:.1f} cycles."
            ),
            status="open",
            created_at=now,
        )
        counter += 1

    return alerts


def _seed_models() -> dict[str, ModelRecord]:
    now = datetime(2026, 6, 29, 10, 0, tzinfo=timezone.utc)
    entries = [
        ("lstm_rul_v1", "lstm", 13.4, 18.7, None, True),
        ("gru_rul_v1", "gru", 12.8, 17.9, 310.2, False),
        ("baseline_rf_v1", "baseline", 18.2, 24.1, 640.0, False),
    ]
    models: dict[str, ModelRecord] = {}
    for index, (name, model_type, mae, rmse, nasa, is_prod) in enumerate(entries, start=1):
        model_id = str(uuid.uuid5(MODEL_NAMESPACE, name))
        models[model_id] = ModelRecord(
            id=model_id,
            model_name=name,
            model_type=model_type,
            dataset_name="FD001",
            mae=mae,
            rmse=rmse,
            nasa_score=nasa,
            is_production=is_prod,
            created_at=now,
        )
    return models


def create_mock_store() -> MockStore:
    engines = _seed_engines()
    return MockStore(
        engines=engines,
        alerts=_seed_alerts(engines),
        models=_seed_models(),
    )


mock_store = create_mock_store()


def _open_alert_count(engine_id: str) -> int:
    return sum(
        1 for alert in mock_store.alerts.values()
        if alert.engine_id == engine_id and alert.status == "open"
    )


def get_fleet() -> FleetResponse:
    engines: list[FleetEngine] = []
    for engine in mock_store.engines.values():
        prediction = _build_prediction(engine.estimated_rul)
        engines.append(
            FleetEngine(
                engine_id=engine.engine_id,
                external_engine_id=engine.external_engine_id,
                latest_cycle=engine.latest_cycle,
                estimated_rul=prediction.estimated_rul,
                lower_ci=prediction.lower_ci,
                upper_ci=prediction.upper_ci,
                health_score=prediction.health_score,
                failure_probability=prediction.failure_probability,
                risk_category=prediction.risk_category,
                open_alerts=_open_alert_count(engine.engine_id),
            )
        )
    engines.sort(key=lambda item: item.external_engine_id)
    return FleetResponse(engines=engines)


def get_engine(engine_id: str) -> EngineDetailResponse:
    engine = mock_store.engines.get(engine_id)
    if engine is None:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found")

    prediction = _build_prediction(engine.estimated_rul)
    return EngineDetailResponse(
        engine_id=engine.engine_id,
        external_engine_id=engine.external_engine_id,
        status=engine.status,
        latest_cycle=engine.latest_cycle,
        latest_prediction=prediction,
        recommendation=generate_recommendation(prediction.risk_category, prediction.estimated_rul),
        open_alerts=_open_alert_count(engine.engine_id),
    )


def get_sensor_history(
    engine_id: str,
    from_cycle: Optional[int] = None,
    to_cycle: Optional[int] = None,
) -> SensorHistoryResponse:
    engine = mock_store.engines.get(engine_id)
    if engine is None:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found")

    start = from_cycle if from_cycle is not None else max(1, engine.latest_cycle - 40)
    end = to_cycle if to_cycle is not None else engine.latest_cycle
    if start > end:
        start, end = end, start

    cycles = list(range(start, end + 1))
    series: dict[str, list[float]] = {f"sensor_{index}": [] for index in range(1, 22)}

    for cycle in cycles:
        wear = (cycle / 300.0) ** 2
        seed = engine.external_engine_id * 1000 + cycle
        base_values = {
            1: 518.0,
            2: 642.0,
            3: 1583.0,
            4: 1400.0,
        }
        for sensor_index in range(1, 22):
            base = base_values.get(sensor_index, 100.0 + sensor_index)
            noise = (_pseudo_random(seed + sensor_index) - 0.5) * 4
            value = base + wear * (sensor_index % 5) + noise
            series[f"sensor_{sensor_index}"].append(round(value, 2))

    return SensorHistoryResponse(engine_id=engine_id, cycles=cycles, series=series)


def get_alerts(
    severity: Optional[AlertSeverity] = None,
    status: Optional[AlertStatus] = None,
    engine_id: Optional[str] = None,
) -> AlertsResponse:
    alerts = list(mock_store.alerts.values())
    if severity:
        alerts = [alert for alert in alerts if alert.severity == severity]
    if status:
        alerts = [alert for alert in alerts if alert.status == status]
    if engine_id:
        alerts = [alert for alert in alerts if alert.engine_id == engine_id]

    alerts.sort(key=lambda item: item.created_at, reverse=True)
    return AlertsResponse(
        alerts=[
            AlertItem(
                id=alert.id,
                engine_id=alert.engine_id,
                external_engine_id=alert.external_engine_id,
                severity=alert.severity,
                title=alert.title,
                message=alert.message,
                status=alert.status,
                created_at=alert.created_at,
            )
            for alert in alerts
        ]
    )


def acknowledge_alert(alert_id: str) -> str:
    alert = mock_store.alerts.get(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    alert.status = "acknowledged"
    return "acknowledged"


def resolve_alert(alert_id: str) -> str:
    alert = mock_store.alerts.get(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    alert.status = "resolved"
    return "resolved"


def get_models() -> ModelsResponse:
    models = sorted(mock_store.models.values(), key=lambda item: item.is_production, reverse=True)
    return ModelsResponse(
        models=[
            ModelItem(
                id=model.id,
                model_name=model.model_name,
                model_type=model.model_type,
                dataset_name=model.dataset_name,
                mae=model.mae,
                rmse=model.rmse,
                nasa_score=model.nasa_score,
                is_production=model.is_production,
                created_at=model.created_at,
            )
            for model in models
        ]
    )
