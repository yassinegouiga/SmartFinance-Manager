

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.dependencies import get_current_user, get_db
from src.main import app




TEST_USER_ID = uuid.uuid4()
TEST_FIREBASE_UID = "firebase_test_uid_123"
TEST_EMAIL = "testuser@example.com"
TEST_NOW = datetime.now(timezone.utc)


def make_test_user(**overrides) -> MagicMock:
    defaults = dict(
        id=TEST_USER_ID,
        firebase_uid=TEST_FIREBASE_UID,
        email=TEST_EMAIL,
        first_name="John",
        last_name="Doe",
        avatar_url="https://lh3.googleusercontent.com/a/example",
        auth_provider="google.com",
        currency="USD",
        theme="light",
        created_at=TEST_NOW,
        updated_at=TEST_NOW,
    )
    defaults.update(overrides)

    mock_user = MagicMock()
    for key, value in defaults.items():
        setattr(mock_user, key, value)

    mock_user.__repr__ = lambda self: f"<MockUser {defaults['email']}>"

    return mock_user




@pytest.fixture
def test_user() -> MagicMock:
    return make_test_user()


@pytest.fixture
def mock_db() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.delete = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
async def client(test_user, mock_db) -> AsyncClient:

    async def override_get_db():
        yield mock_db

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
