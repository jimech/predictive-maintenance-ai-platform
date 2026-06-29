# Backend Plan

## Goal

Build a FastAPI backend that supports:

- Health checks
- API v1 routes
- PostgreSQL persistence
- ML inference
- Dataset pipeline
- Model training
- MLflow tracking
- Alerts
- Auth-ready protected endpoints
- Monitoring-ready logs

## Backend Structure

```text
backend/
  app/
    main.py
    core/
      config.py
      logging.py
      security.py
    api/
      deps.py
      v1/
        router.py
        routes_fleet.py
        routes_engines.py
        routes_predictions.py
        routes_alerts.py
        routes_models.py
        routes_admin.py
    db/
      session.py
      base.py
      models.py
      migrations/
    schemas/
      fleet.py
      engine.py
      prediction.py
      alert.py
      model.py
    services/
      inference_service.py
      feature_service.py
      alert_service.py
      model_registry_service.py
    ml/
      data/
        ingest_cmapss.py
        preprocess.py
        datasets.py
      features/
        feature_engineering.py
        scalers.py
      models/
        baseline.py
        lstm.py
        autoencoder.py
      training/
        train_baseline.py
        train_lstm.py
        evaluate.py
      inference/
        predict.py
        explain.py
    tests/
  Dockerfile
  pyproject.toml
  alembic.ini
  README.md
```

## First Backend MVP

Implement in this order:

1. FastAPI app
2. `/health`
3. `/ready`
4. `/api/v1` router
5. Config module
6. Structured logging
7. Pytest setup
8. Dockerfile
9. PostgreSQL connection
10. SQLAlchemy models
11. Alembic migrations
12. Mock-compatible API responses
13. Real database-backed API responses
14. Dataset loader
15. Feature engineering
16. Baseline training
17. MLflow tracking
18. Inference service
19. Alert generation
20. Auth validation

## Initial FastAPI Requirements

`GET /health`

```json
{
  "status": "ok"
}
```

`GET /ready`

```json
{
  "status": "ready",
  "database": "ok",
  "model": "not_loaded"
}
```

## Required API Routes

```text
GET /api/v1/fleet
GET /api/v1/engines/{engine_id}
GET /api/v1/engines/{engine_id}/sensors
POST /api/v1/predict
GET /api/v1/alerts
POST /api/v1/alerts/{alert_id}/acknowledge
POST /api/v1/alerts/{alert_id}/resolve
GET /api/v1/models
POST /api/v1/admin/datasets/load
POST /api/v1/admin/preprocess
POST /api/v1/admin/train
```

## Backend Coding Rules

- Use Pydantic schemas for all request/response models.
- Keep database models separate from API schemas.
- Keep ML logic separate from route handlers.
- Route handlers should call services.
- Services should contain business logic.
- Use dependency injection for DB session and current user.
- Keep auth optional until core endpoints work.
- Add tests for risk classification, feature engineering, and alerts.
- Do not hardcode secrets.
- Use environment variables.
- Make all scripts runnable from CLI.

## Service Responsibilities

### `inference_service.py`

- Load active model
- Cache model
- Run feature transformation
- Predict RUL
- Calculate uncertainty
- Calculate health score
- Classify risk
- Generate recommendation
- Persist prediction

### `feature_service.py`

- Convert sensor input into model-ready features
- Load scaler and feature metadata
- Prevent future leakage
- Support tabular and sequence model input

### `alert_service.py`

- Generate warning/critical alerts
- Avoid duplicate open alerts
- Acknowledge alerts
- Resolve alerts

### `model_registry_service.py`

- Read active production model from DB
- Load artifact from MLflow or local storage
- Expose model metadata
- Support model reload

## Testing Strategy

Minimum tests:

```text
test_health.py
test_risk_scoring.py
test_alert_service.py
test_feature_engineering.py
test_api_contract.py
```

## Acceptance Criteria for Backend Foundation

- Backend runs with `uvicorn app.main:app --reload`.
- `GET /health` returns `{"status": "ok"}`.
- `/api/v1` router exists.
- Config loads from environment variables.
- Tests run with `pytest`.
- Docker build succeeds.
