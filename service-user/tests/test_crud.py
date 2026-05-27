"""
Unit tests for the CRUD layer.
Mocks the AsyncSession to verify correct SQLAlchemy calls
without needing a real database connection.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.crud.user import (
    get_user_by_firebase_uid,
    get_user_by_id,
    get_user_by_email,
    create_user,
    update_user,
    update_settings,
    delete_user,
)
from src.schemas.user import UserCreate, UserUpdate, SettingsUpdate
from tests.conftest import make_test_user


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Read Operations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestGetUserByFirebaseUid:
    @pytest.mark.asyncio
    async def test_returns_user_when_found(self, mock_db):
        user = make_test_user()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = user
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_user_by_firebase_uid(mock_db, "firebase_test_uid_123")

        assert result is user
        mock_db.execute.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self, mock_db):
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_user_by_firebase_uid(mock_db, "nonexistent_uid")

        assert result is None


class TestGetUserById:
    @pytest.mark.asyncio
    async def test_returns_user_when_found(self, mock_db):
        user = make_test_user()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = user
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_user_by_id(mock_db, user.id)

        assert result is user

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_id(self, mock_db):
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_user_by_id(mock_db, uuid.uuid4())

        assert result is None


class TestGetUserByEmail:
    @pytest.mark.asyncio
    async def test_returns_user_when_found(self, mock_db):
        user = make_test_user()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = user
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_user_by_email(mock_db, "testuser@example.com")

        assert result is user


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Write Operations
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestCreateUser:
    @pytest.mark.asyncio
    async def test_creates_user_and_commits(self, mock_db):
        user_in = UserCreate(firebase_uid="new_uid", email="new@example.com")

        result = await create_user(mock_db, user_in)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()
        assert result.firebase_uid == "new_uid"
        assert result.email == "new@example.com"


class TestUpdateUser:
    @pytest.mark.asyncio
    async def test_updates_first_name(self, mock_db):
        user = make_test_user(first_name="OldName")
        user_in = UserUpdate(first_name="NewName")

        result = await update_user(mock_db, user, user_in)

        assert result.first_name == "NewName"
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_partial_update_only_changes_provided_fields(self, mock_db):
        user = make_test_user(first_name="John", last_name="Doe")
        user_in = UserUpdate(first_name="Jane")

        result = await update_user(mock_db, user, user_in)

        assert result.first_name == "Jane"
        assert result.last_name == "Doe"  # unchanged


class TestUpdateSettings:
    @pytest.mark.asyncio
    async def test_updates_currency(self, mock_db):
        user = make_test_user(currency="USD")
        settings_in = SettingsUpdate(currency="EUR")

        result = await update_settings(mock_db, user, settings_in)

        assert result.currency == "EUR"
        mock_db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_updates_theme(self, mock_db):
        user = make_test_user(theme="light")
        settings_in = SettingsUpdate(theme="dark")

        result = await update_settings(mock_db, user, settings_in)

        assert result.theme == "dark"

    @pytest.mark.asyncio
    async def test_partial_settings_update(self, mock_db):
        user = make_test_user(currency="USD", theme="light")
        settings_in = SettingsUpdate(theme="dark")

        result = await update_settings(mock_db, user, settings_in)

        assert result.theme == "dark"
        assert result.currency == "USD"  # unchanged


class TestDeleteUser:
    @pytest.mark.asyncio
    async def test_deletes_user_and_commits(self, mock_db):
        user = make_test_user()

        await delete_user(mock_db, user)

        mock_db.delete.assert_awaited_once_with(user)
        mock_db.commit.assert_awaited_once()
