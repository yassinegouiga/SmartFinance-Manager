"""
Async SQLAlchemy database engine and session factory.
Uses asyncpg for non-blocking PostgreSQL I/O as specified in the architecture.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import settings

# Async engine — pool size tuned for a single-service MVP
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
)

# Session factory — expire_on_commit=False avoids lazy-load issues in async context
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
