"""
SmartFinance Billing Service — FastAPI Application.

This is the entry point for the Billing microservice.
Responsibilities (architecture §4):
  - Managing recurring bills
  - Due dates and paid/unpaid statuses
  - Tracking upcoming payments

Monitoring (architecture §20):
  - /health endpoint for uptime checks
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.database import engine
from src.models.base import Base
from src.api.v1.router import api_router
from src.services.redis_service import redis_publisher

# ── JSON-structured logging (architecture §20) ───────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("billing-service")


# ── Application Lifespan ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create the billing_service schema and tables (dev convenience).
    In production, Alembic migrations handle schema changes.
    """
    logger.info("Starting Billing Service...")

    # Import all models so Base.metadata knows about them
    from src.models import Bill  # noqa: F401

    await redis_publisher.connect()

    async with engine.begin() as conn:
        # Ensure the isolated schema exists
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS billing_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables ready.")

    # Start the scheduler
    from src.services.scheduler import run_scheduler
    import asyncio
    scheduler_task = asyncio.create_task(run_scheduler())

    yield

    # Shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    
    await engine.dispose()
    await redis_publisher.disconnect()
    logger.info("Billing Service shut down.")


# ── FastAPI App ───────────────────────────────────────────
app = FastAPI(
    title="SmartFinance Billing Service",
    description="Recurring bills and payment tracking service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


# ── Health Check (architecture §20) ──────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe for monitoring tools."""
    return {"status": "healthy", "service": "billing-service"}
