"""
Application configuration loaded from environment variables.
Uses Pydantic BaseSettings for type-safe, validated config management.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central configuration for the User Service.
    All values are loaded from environment variables or a .env file.
    """

    # ── Service Metadata ──────────────────────────────────
    PROJECT_NAME: str = "SmartFinance Transaction Service"
    API_V1_PREFIX: str = "/api/v1"
    SERVICE_PORT: int = 8002

    # ── Database ──────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/smartfinance_users"

    # ── Firebase ──────────────────────────────────────────
    FIREBASE_CREDENTIALS_PATH: str = ""

    # ── CORS ──────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
