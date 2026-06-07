

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.database import engine
from src.models.base import Base
from src.api.v1.router import api_router
from src.services.redis_service import redis_publisher


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("billing-service")



@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting Billing Service...")

    from src.models import Bill

    await redis_publisher.connect()

    async with engine.begin() as conn:
        from sqlalchemy import text

        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS billing_service"))
        await conn.run_sync(Base.metadata.create_all)

        table = "bills" if os.environ.get("TESTING") else "billing_service.bills"
        await conn.execute(
            text(f"ALTER TABLE IF EXISTS {table} ADD COLUMN IF NOT EXISTS category_id VARCHAR")
        )

    logger.info("Database tables ready.")

    from src.services.scheduler import run_scheduler
    import asyncio
    scheduler_task = asyncio.create_task(run_scheduler())

    yield

    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    
    await engine.dispose()
    await redis_publisher.disconnect()
    logger.info("Billing Service shut down.")



app = FastAPI(
    title="SmartFinance Billing Service",
    description="Recurring bills and payment tracking service",
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
    return {"status": "healthy", "service": "billing-service"}
