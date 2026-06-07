

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):


    PROJECT_NAME: str = "SmartFinance User Service"
    API_V1_PREFIX: str = "/api/v1"
    SERVICE_PORT: int = 8001


    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/smartfinance_users"


    FIREBASE_CREDENTIALS_PATH: str = ""


    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
