"""
SmartFinance Transaction Service — FastAPI Application.

This is the entry point for the Transaction microservice.
Responsibilities (architecture §2):
  - CRUD operations for income and expenses
  - Categorization
  - Search/filtering/pagination

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
from src.api.v1.endpoints import transactions, categories

# ── JSON-structured logging (architecture §20) ───────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("transaction-service")


# ── Application Lifespan ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create the transaction_service schema and tables (dev convenience).
    In production, Alembic migrations handle schema changes.
    """
    logger.info("Starting Transaction Service...")

    from src.services.redis_service import redis_publisher
    await redis_publisher.connect()

    async with engine.begin() as conn:
        # Ensure the isolated schema exists
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS transaction_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    # Seed default categories
    from src.core.database import AsyncSessionLocal
    from src.crud.crud_category import seed_categories
    async with AsyncSessionLocal() as session:
        await seed_categories(session)

    logger.info("Database tables ready.")
    yield

    # Shutdown
    await engine.dispose()
    await redis_publisher.disconnect()
    logger.info("Transaction Service shut down.")


# ── FastAPI App ───────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
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
app.include_router(transactions.router, prefix=f"{settings.API_V1_PREFIX}/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix=f"{settings.API_V1_PREFIX}/categories", tags=["Categories"])


# ── Health Check (architecture §20) ──────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe for monitoring tools."""
    return {"status": "healthy", "service": "transaction-service"}
