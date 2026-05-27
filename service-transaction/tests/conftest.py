import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.dependencies import get_current_user_id, get_db
from src.main import app

TEST_FIREBASE_UID = "firebase_test_uid_123"

@pytest.fixture
def test_user_id() -> str:
    return TEST_FIREBASE_UID

@pytest.fixture
def mock_db() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.add = MagicMock()
    return session

@pytest.fixture
async def client(test_user_id, mock_db) -> AsyncClient:
    async def override_get_db():
        yield mock_db

    async def override_get_current_user_id():
        return test_user_id

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
