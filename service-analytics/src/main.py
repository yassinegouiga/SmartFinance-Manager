import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.database import engine
from src.models.base import Base
from src.api.v1.router import api_router
from src.services.redis_service import redis_client
from src.services.event_listener import listen_to_redis_events

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("analytics-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Analytics Service...")

    from src.models import MonthlySummary, Notification  # noqa: F401

    await redis_client.connect()

    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS analytics_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables ready.")

    listener_task = asyncio.create_task(listen_to_redis_events())

    yield

    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass

    await engine.dispose()
    await redis_client.disconnect()
    logger.info("Analytics Service shut down.")


app = FastAPI(
    title="SmartFinance Analytics Service",
    description="Aggregates financial data and handles notifications",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "analytics-service"}
