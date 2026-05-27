import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from unittest.mock import AsyncMock, patch

from src.main import app
from src.api.dependencies import get_current_user_id, get_db
from src.models import Base

import os
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)
TestingSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

async def override_get_current_user_id():
    return "test-user-id"

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_id] = override_get_current_user_id

@pytest.fixture(scope="function")
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
async def client(db_session):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

from unittest.mock import AsyncMock, patch, MagicMock

@pytest.fixture(scope="function", autouse=True)
def mock_session_local():
    with patch("src.services.redis_service.AsyncSessionLocal", new=TestingSessionLocal):
        yield

@pytest.fixture(scope="function", autouse=True)
def mock_redis():
    with patch("src.services.redis_service.redis.from_url") as mock_from_url:
        mock_client = MagicMock()
        mock_pubsub = AsyncMock()
        mock_client.pubsub.return_value = mock_pubsub
        mock_client.publish = AsyncMock()
        mock_from_url.return_value = mock_client
        yield mock_client
