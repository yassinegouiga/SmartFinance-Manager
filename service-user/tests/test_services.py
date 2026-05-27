"""
Unit tests for the business logic / service layer.
Mocks the CRUD layer to isolate domain logic.
"""

from unittest.mock import AsyncMock, patch

import pytest

from src.services.user import get_or_create_user
from tests.conftest import make_test_user


class TestGetOrCreateUser:
    """Tests for the auto-onboarding logic (architecture §9 step 6)."""

    @pytest.mark.asyncio
    @patch("src.services.user.get_user_by_firebase_uid", new_callable=AsyncMock)
    async def test_returns_existing_user(self, mock_get, mock_db):
        """When user already exists, return them with is_new=False."""
        existing_user = make_test_user()
        mock_get.return_value = existing_user

        user, is_new = await get_or_create_user(
            mock_db, firebase_uid="firebase_test_uid_123", email="test@example.com"
        )

        assert user is existing_user
        assert is_new is False
        mock_get.assert_awaited_once_with(mock_db, "firebase_test_uid_123")

    @pytest.mark.asyncio
    @patch("src.services.user.create_user", new_callable=AsyncMock)
    @patch("src.services.user.get_user_by_firebase_uid", new_callable=AsyncMock)
    async def test_creates_new_user_on_first_login(self, mock_get, mock_create, mock_db):
        """When user doesn't exist, auto-create and return with is_new=True."""
        mock_get.return_value = None
        new_user = make_test_user(firebase_uid="brand_new_uid", email="new@example.com")
        mock_create.return_value = new_user

        user, is_new = await get_or_create_user(
            mock_db, firebase_uid="brand_new_uid", email="new@example.com"
        )

        assert user is new_user
        assert is_new is True
        mock_create.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("src.services.user.create_user", new_callable=AsyncMock)
    @patch("src.services.user.get_user_by_firebase_uid", new_callable=AsyncMock)
    async def test_create_user_receives_correct_schema(self, mock_get, mock_create, mock_db):
        """Verify the UserCreate schema is built with the right uid and email."""
        mock_get.return_value = None
        mock_create.return_value = make_test_user()

        await get_or_create_user(
            mock_db, firebase_uid="uid_abc", email="abc@example.com"
        )

        call_args = mock_create.call_args
        user_create = call_args[0][1]  # second positional arg
        assert user_create.firebase_uid == "uid_abc"
        assert user_create.email == "abc@example.com"
