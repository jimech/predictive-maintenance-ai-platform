# Database Schema

## Overview

PostgreSQL stores user identity, fleet metadata, sensor readings, model runs, predictions, and alerts.

Sensor readings are stored in wide-table format for MVP simplicity because NASA C-MAPSS has a fixed set of 21 sensors.

## Tables

```text
users
engines
sensor_readings
model_runs
predictions
alerts
```

---

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    auth_provider_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'engineer', 'operator', 'viewer')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## engines

```sql
CREATE TABLE engines (
    id UUID PRIMARY KEY,
    external_engine_id INTEGER NOT NULL,
    dataset_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (external_engine_id, dataset_name)
);
```

## sensor_readings

```sql
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY,
    engine_id UUID NOT NULL REFERENCES engines(id),
    cycle INTEGER NOT NULL,
    op_setting_1 DOUBLE PRECISION,
    op_setting_2 DOUBLE PRECISION,
    op_setting_3 DOUBLE PRECISION,
    sensor_1 DOUBLE PRECISION,
    sensor_2 DOUBLE PRECISION,
    sensor_3 DOUBLE PRECISION,
    sensor_4 DOUBLE PRECISION,
    sensor_5 DOUBLE PRECISION,
    sensor_6 DOUBLE PRECISION,
    sensor_7 DOUBLE PRECISION,
    sensor_8 DOUBLE PRECISION,
    sensor_9 DOUBLE PRECISION,
    sensor_10 DOUBLE PRECISION,
    sensor_11 DOUBLE PRECISION,
    sensor_12 DOUBLE PRECISION,
    sensor_13 DOUBLE PRECISION,
    sensor_14 DOUBLE PRECISION,
    sensor_15 DOUBLE PRECISION,
    sensor_16 DOUBLE PRECISION,
    sensor_17 DOUBLE PRECISION,
    sensor_18 DOUBLE PRECISION,
    sensor_19 DOUBLE PRECISION,
    sensor_20 DOUBLE PRECISION,
    sensor_21 DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (engine_id, cycle)
);
```

## model_runs

```sql
CREATE TABLE model_runs (
    id UUID PRIMARY KEY,
    mlflow_run_id TEXT,
    model_name TEXT NOT NULL,
    model_type TEXT NOT NULL,
    dataset_name TEXT NOT NULL,
    artifact_uri TEXT,
    mae DOUBLE PRECISION,
    rmse DOUBLE PRECISION,
    nasa_score DOUBLE PRECISION,
    is_production BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## predictions

```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    engine_id UUID NOT NULL REFERENCES engines(id),
    model_run_id UUID REFERENCES model_runs(id),
    cycle INTEGER NOT NULL,
    estimated_rul DOUBLE PRECISION NOT NULL,
    lower_ci DOUBLE PRECISION,
    upper_ci DOUBLE PRECISION,
    health_score DOUBLE PRECISION NOT NULL,
    failure_probability DOUBLE PRECISION,
    risk_category TEXT NOT NULL CHECK (risk_category IN ('healthy', 'watch', 'warning', 'critical')),
    top_contributing_sensors JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## alerts

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY,
    engine_id UUID NOT NULL REFERENCES engines(id),
    prediction_id UUID REFERENCES predictions(id),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## Index Recommendations

```sql
CREATE INDEX idx_sensor_readings_engine_cycle ON sensor_readings(engine_id, cycle);
CREATE INDEX idx_predictions_engine_created ON predictions(engine_id, created_at DESC);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX idx_model_runs_production ON model_runs(is_production);
```

## SQLAlchemy Notes

Use SQLAlchemy ORM models that map directly to these tables.

Recommended enum-like fields:

```text
users.role: admin | engineer | operator | viewer
predictions.risk_category: healthy | watch | warning | critical
alerts.severity: info | warning | critical
alerts.status: open | acknowledged | resolved
```

Use Alembic migrations for all schema changes.
