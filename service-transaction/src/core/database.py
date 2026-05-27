"""
Async SQLAlchemy database engine and session factory.
Uses asyncpg for non-blocking PostgreSQL I/O as specified in the architecture.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import settings

# Async engine — pool size tuned for a single-service MVP
_engine_kwargs = {"echo": False}
if not settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# Session factory — expire_on_commit=False avoids lazy-load issues in async context
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
