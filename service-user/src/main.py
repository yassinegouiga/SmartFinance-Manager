"""
SmartFinance User Service — FastAPI Application.

This is the entry point for the User & Auth microservice.
Responsibilities (architecture §2):
  - User profile management
  - Application settings & preferences
  - Firebase token validation & user onboarding
  - Account deletion

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
from src.api.v1.router import router as users_router

# ── JSON-structured logging (architecture §20) ───────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("user-service")


# ── Application Lifespan ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create the user_service schema and tables (dev convenience).
    In production, Alembic migrations handle schema changes.
    """
    logger.info("Starting User Service...")

    async with engine.begin() as conn:
        # Ensure the isolated schema exists
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS user_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables ready.")
    yield

    # Shutdown
    await engine.dispose()
    logger.info("User Service shut down.")


# ── FastAPI App ───────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware (architecture §7 — centralized in gateway, but also here for local dev) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(users_router, prefix=settings.API_V1_PREFIX)


# ── Health Check (architecture §20) ──────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe for monitoring tools (e.g., Uptime Kuma)."""
    return {"status": "healthy", "service": "user-service"}
