from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'engineer', 'operator', 'viewer')",
            name="ck_users_role",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    auth_provider_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    acknowledged_alerts: Mapped[list["Alert"]] = relationship(back_populates="acknowledged_by_user")


class Engine(Base):
    __tablename__ = "engines"
    __table_args__ = (UniqueConstraint("external_engine_id", "dataset_name", name="uq_engines_external_dataset"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_engine_id: Mapped[int] = mapped_column(Integer, nullable=False)
    dataset_name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    sensor_readings: Mapped[list["SensorReading"]] = relationship(back_populates="engine")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="engine")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="engine")


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        UniqueConstraint("engine_id", "cycle", name="uq_sensor_readings_engine_cycle"),
        Index("idx_sensor_readings_engine_cycle", "engine_id", "cycle"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("engines.id"), nullable=False)
    cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    op_setting_1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    op_setting_2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    op_setting_3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_4: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_5: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_6: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_7: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_8: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_9: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_10: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_11: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_12: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_13: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_14: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_15: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_16: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_17: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_18: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_19: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_20: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sensor_21: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    engine: Mapped["Engine"] = relationship(back_populates="sensor_readings")


class ModelRun(Base):
    __tablename__ = "model_runs"
    __table_args__ = (Index("idx_model_runs_production", "is_production"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mlflow_run_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    model_type: Mapped[str] = mapped_column(Text, nullable=False)
    dataset_name: Mapped[str] = mapped_column(Text, nullable=False)
    artifact_uri: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mae: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rmse: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nasa_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_production: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    predictions: Mapped[list["Prediction"]] = relationship(back_populates="model_run")


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        CheckConstraint(
            "risk_category IN ('healthy', 'watch', 'warning', 'critical')",
            name="ck_predictions_risk_category",
        ),
        Index("idx_predictions_engine_created", "engine_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("engines.id"), nullable=False)
    model_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("model_runs.id"), nullable=True)
    cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_rul: Mapped[float] = mapped_column(Float, nullable=False)
    lower_ci: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    upper_ci: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    health_score: Mapped[float] = mapped_column(Float, nullable=False)
    failure_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    risk_category: Mapped[str] = mapped_column(String(32), nullable=False)
    top_contributing_sensors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    engine: Mapped["Engine"] = relationship(back_populates="predictions")
    model_run: Mapped[Optional["ModelRun"]] = relationship(back_populates="predictions")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="prediction")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint("severity IN ('info', 'warning', 'critical')", name="ck_alerts_severity"),
        CheckConstraint("status IN ('open', 'acknowledged', 'resolved')", name="ck_alerts_status"),
        Index("idx_alerts_status_severity", "status", "severity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    engine_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("engines.id"), nullable=False)
    prediction_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("predictions.id"), nullable=True)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="open")
    acknowledged_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)

    engine: Mapped["Engine"] = relationship(back_populates="alerts")
    prediction: Mapped[Optional["Prediction"]] = relationship(back_populates="alerts")
    acknowledged_by_user: Mapped[Optional["User"]] = relationship(back_populates="acknowledged_alerts")
