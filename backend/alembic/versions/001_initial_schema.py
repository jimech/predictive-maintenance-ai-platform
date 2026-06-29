"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-06-29

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("auth_provider_id", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "role IN ('admin', 'engineer', 'operator', 'viewer')",
            name="ck_users_role",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("auth_provider_id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "engines",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("external_engine_id", sa.Integer(), nullable=False),
        sa.Column("dataset_name", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_engine_id", "dataset_name", name="uq_engines_external_dataset"),
    )

    op.create_table(
        "model_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mlflow_run_id", sa.Text(), nullable=True),
        sa.Column("model_name", sa.Text(), nullable=False),
        sa.Column("model_type", sa.Text(), nullable=False),
        sa.Column("dataset_name", sa.Text(), nullable=False),
        sa.Column("artifact_uri", sa.Text(), nullable=True),
        sa.Column("mae", sa.Float(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("nasa_score", sa.Float(), nullable=True),
        sa.Column("is_production", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_model_runs_production", "model_runs", ["is_production"], unique=False)

    op.create_table(
        "sensor_readings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("engine_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cycle", sa.Integer(), nullable=False),
        sa.Column("op_setting_1", sa.Float(), nullable=True),
        sa.Column("op_setting_2", sa.Float(), nullable=True),
        sa.Column("op_setting_3", sa.Float(), nullable=True),
        sa.Column("sensor_1", sa.Float(), nullable=True),
        sa.Column("sensor_2", sa.Float(), nullable=True),
        sa.Column("sensor_3", sa.Float(), nullable=True),
        sa.Column("sensor_4", sa.Float(), nullable=True),
        sa.Column("sensor_5", sa.Float(), nullable=True),
        sa.Column("sensor_6", sa.Float(), nullable=True),
        sa.Column("sensor_7", sa.Float(), nullable=True),
        sa.Column("sensor_8", sa.Float(), nullable=True),
        sa.Column("sensor_9", sa.Float(), nullable=True),
        sa.Column("sensor_10", sa.Float(), nullable=True),
        sa.Column("sensor_11", sa.Float(), nullable=True),
        sa.Column("sensor_12", sa.Float(), nullable=True),
        sa.Column("sensor_13", sa.Float(), nullable=True),
        sa.Column("sensor_14", sa.Float(), nullable=True),
        sa.Column("sensor_15", sa.Float(), nullable=True),
        sa.Column("sensor_16", sa.Float(), nullable=True),
        sa.Column("sensor_17", sa.Float(), nullable=True),
        sa.Column("sensor_18", sa.Float(), nullable=True),
        sa.Column("sensor_19", sa.Float(), nullable=True),
        sa.Column("sensor_20", sa.Float(), nullable=True),
        sa.Column("sensor_21", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["engine_id"], ["engines.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("engine_id", "cycle", name="uq_sensor_readings_engine_cycle"),
    )
    op.create_index("idx_sensor_readings_engine_cycle", "sensor_readings", ["engine_id", "cycle"], unique=False)

    op.create_table(
        "predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("engine_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("model_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("cycle", sa.Integer(), nullable=False),
        sa.Column("estimated_rul", sa.Float(), nullable=False),
        sa.Column("lower_ci", sa.Float(), nullable=True),
        sa.Column("upper_ci", sa.Float(), nullable=True),
        sa.Column("health_score", sa.Float(), nullable=False),
        sa.Column("failure_probability", sa.Float(), nullable=True),
        sa.Column("risk_category", sa.String(length=32), nullable=False),
        sa.Column("top_contributing_sensors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "risk_category IN ('healthy', 'watch', 'warning', 'critical')",
            name="ck_predictions_risk_category",
        ),
        sa.ForeignKeyConstraint(["engine_id"], ["engines.id"]),
        sa.ForeignKeyConstraint(["model_run_id"], ["model_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_predictions_engine_created", "predictions", ["engine_id", "created_at"], unique=False)

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("engine_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prediction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="open", nullable=False),
        sa.Column("acknowledged_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("severity IN ('info', 'warning', 'critical')", name="ck_alerts_severity"),
        sa.CheckConstraint("status IN ('open', 'acknowledged', 'resolved')", name="ck_alerts_status"),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["engine_id"], ["engines.id"]),
        sa.ForeignKeyConstraint(["prediction_id"], ["predictions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_alerts_status_severity", "alerts", ["status", "severity"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_alerts_status_severity", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("idx_predictions_engine_created", table_name="predictions")
    op.drop_table("predictions")
    op.drop_index("idx_sensor_readings_engine_cycle", table_name="sensor_readings")
    op.drop_table("sensor_readings")
    op.drop_index("idx_model_runs_production", table_name="model_runs")
    op.drop_table("model_runs")
    op.drop_table("engines")
    op.drop_table("users")
