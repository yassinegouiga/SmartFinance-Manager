from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.core.config import settings
from src.api.v1.router import api_router
from src.services.redis_service import redis_subscriber

from src.core.database import engine
from src.models.base import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    import logging
    logger = logging.getLogger("budget-service")
    logger.info("Starting Budget Service...")
    
    async with engine.begin() as conn:
        # Ensure the isolated schema exists
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS budget_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    await redis_subscriber.start_listening()
    yield
    # Shutdown
    await redis_subscriber.disconnect()

app = FastAPI(
    title="SmartFinance Budget Service",
    description="Budget and Saving Pots management service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
