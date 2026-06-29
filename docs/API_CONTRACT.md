# API Contract

## Base URL

Local backend:

```text
http://localhost:8000
```

Frontend should use:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## Auth Header

Protected endpoints should eventually use:

```http
Authorization: Bearer <jwt>
```

For early MVP development, endpoints may be open or use a mock user dependency. Auth should be added after the core API works.

---

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

---

## Readiness Check

```http
GET /ready
```

Response:

```json
{
  "status": "ready",
  "database": "ok",
  "model": "loaded"
}
```

---

## Fleet Overview

```http
GET /api/v1/fleet
```

Response:

```json
{
  "engines": [
    {
      "engine_id": "uuid",
      "external_engine_id": 12,
      "latest_cycle": 188,
      "estimated_rul": 22.4,
      "lower_ci": 16.2,
      "upper_ci": 30.8,
      "health_score": 0.31,
      "failure_probability": 0.78,
      "risk_category": "critical",
      "open_alerts": 2
    }
  ]
}
```

Risk category values:

```text
healthy
watch
warning
critical
```

---

## Engine Detail

```http
GET /api/v1/engines/{engine_id}
```

Response:

```json
{
  "engine_id": "uuid",
  "external_engine_id": 12,
  "status": "active",
  "latest_cycle": 188,
  "latest_prediction": {
    "estimated_rul": 22.4,
    "lower_ci": 16.2,
    "upper_ci": 30.8,
    "health_score": 0.31,
    "failure_probability": 0.78,
    "risk_category": "critical"
  },
  "recommendation": "Schedule maintenance within 20 cycles.",
  "open_alerts": 2
}
```

---

## Sensor History

```http
GET /api/v1/engines/{engine_id}/sensors?from_cycle=100&to_cycle=200
```

Response:

```json
{
  "engine_id": "uuid",
  "cycles": [100, 101, 102],
  "series": {
    "sensor_2": [642.1, 642.3, 642.8],
    "sensor_3": [1583.4, 1584.0, 1584.9],
    "sensor_4": [1400.1, 1401.4, 1403.2]
  }
}
```

---

## Predict

```http
POST /api/v1/predict
```

Request:

```json
{
  "engine_id": "uuid",
  "cycle": 188,
  "operational_settings": [0.001, 0.0002, 100.0],
  "sensor_readings": {
    "sensor_1": 518.67,
    "sensor_2": 642.12,
    "sensor_3": 1583.45,
    "sensor_4": 1401.88
  }
}
```

Response:

```json
{
  "estimated_rul": 22.4,
  "lower_ci": 16.2,
  "upper_ci": 30.8,
  "health_score": 0.31,
  "failure_probability": 0.78,
  "risk_category": "critical",
  "top_contributing_sensors": [
    {
      "sensor": "sensor_11",
      "importance": 0.22
    },
    {
      "sensor": "sensor_4",
      "importance": 0.18
    }
  ],
  "recommendation": "Schedule maintenance immediately. Estimated RUL is 22.4 cycles."
}
```

---

## Alerts

### List Alerts

```http
GET /api/v1/alerts
```

Optional filters:

```text
severity=warning|critical|info
status=open|acknowledged|resolved
engine_id=uuid
```

Response:

```json
{
  "alerts": [
    {
      "id": "uuid",
      "engine_id": "uuid",
      "external_engine_id": 12,
      "severity": "critical",
      "title": "Critical failure risk",
      "message": "Engine 12 has estimated RUL of 18.5 cycles.",
      "status": "open",
      "created_at": "2026-06-29T10:00:00Z"
    }
  ]
}
```

### Acknowledge Alert

```http
POST /api/v1/alerts/{alert_id}/acknowledge
```

Response:

```json
{
  "status": "acknowledged"
}
```

### Resolve Alert

```http
POST /api/v1/alerts/{alert_id}/resolve
```

Response:

```json
{
  "status": "resolved"
}
```

---

## Models

```http
GET /api/v1/models
```

Response:

```json
{
  "models": [
    {
      "id": "uuid",
      "model_name": "lstm_rul_v1",
      "model_type": "lstm",
      "dataset_name": "FD001",
      "mae": 13.4,
      "rmse": 18.7,
      "nasa_score": null,
      "is_production": true,
      "created_at": "2026-06-29T10:00:00Z"
    }
  ]
}
```

---

## Admin Pipeline Endpoints

### Load Dataset

```http
POST /api/v1/admin/datasets/load
```

Response:

```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "Dataset loading started."
}
```

### Run Preprocessing

```http
POST /api/v1/admin/preprocess
```

Response:

```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "Preprocessing started."
}
```

### Train Model

```http
POST /api/v1/admin/train
```

Request:

```json
{
  "model_type": "baseline"
}
```

Allowed `model_type` values:

```text
baseline
lstm
gru
```

Response:

```json
{
  "job_id": "uuid",
  "status": "started",
  "message": "Training started."
}
```

## Frontend Integration Notes

The frontend should use `VITE_API_BASE_URL`, keep mock data available, use Demo Mode until backend is ready, keep API types in `src/api/types.ts`, keep API functions in `src/api/client.ts`, and add auth token injection later.
