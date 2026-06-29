from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Predictive Maintenance API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql://postgres:postgres@localhost:5432/predictive_maintenance"
    test_database_url: str = "postgresql://postgres:postgres@localhost:5432/predictive_maintenance_test"

    mlflow_tracking_uri: str = "http://localhost:5000"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @property
    def sqlalchemy_database_url(self) -> str:
        return self._to_sqlalchemy_url(self.database_url)

    @property
    def sqlalchemy_test_database_url(self) -> str:
        return self._to_sqlalchemy_url(self.test_database_url)

    @staticmethod
    def _to_sqlalchemy_url(url: str) -> str:
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"dev", "development"}:
                return True
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
