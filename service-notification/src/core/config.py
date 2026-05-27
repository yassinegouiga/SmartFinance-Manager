from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-service-account.json"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "SmartFinance <onboarding@resend.dev>"
    SERVICE_PORT: int = 8006

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
