"""
Unit tests for Pydantic schema validation.
Verifies that request DTOs enforce the constraints defined in the architecture.
"""

import pytest
from pydantic import ValidationError

from src.schemas.user import UserCreate, UserUpdate, SettingsUpdate


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  UserCreate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestUserCreate:
    def test_valid_user_create(self):
        user = UserCreate(firebase_uid="abc123", email="test@example.com")
        assert user.firebase_uid == "abc123"
        assert user.email == "test@example.com"

    def test_missing_firebase_uid_raises(self):
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com")

    def test_missing_email_raises(self):
        with pytest.raises(ValidationError):
            UserCreate(firebase_uid="abc123")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  UserUpdate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestUserUpdate:
    def test_valid_partial_update(self):
        update = UserUpdate(first_name="Jane")
        assert update.first_name == "Jane"
        assert update.last_name is None

    def test_empty_update_is_valid(self):
        update = UserUpdate()
        assert update.first_name is None
        assert update.last_name is None

    def test_full_update(self):
        update = UserUpdate(first_name="Jane", last_name="Smith")
        assert update.first_name == "Jane"
        assert update.last_name == "Smith"

    def test_name_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            UserUpdate(first_name="A" * 101)

    def test_name_at_max_length_is_valid(self):
        update = UserUpdate(first_name="A" * 100)
        assert len(update.first_name) == 100


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  SettingsUpdate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TestSettingsUpdate:
    def test_valid_theme_light(self):
        settings = SettingsUpdate(theme="light")
        assert settings.theme == "light"

    def test_valid_theme_dark(self):
        settings = SettingsUpdate(theme="dark")
        assert settings.theme == "dark"

    def test_valid_theme_system(self):
        settings = SettingsUpdate(theme="system")
        assert settings.theme == "system"

    def test_invalid_theme_rejected(self):
        with pytest.raises(ValidationError):
            SettingsUpdate(theme="neon")

    def test_valid_currency(self):
        settings = SettingsUpdate(currency="EUR")
        assert settings.currency == "EUR"

    def test_currency_exceeds_max_length(self):
        with pytest.raises(ValidationError):
            SettingsUpdate(currency="A" * 11)

    def test_empty_settings_update_is_valid(self):
        settings = SettingsUpdate()
        assert settings.currency is None
        assert settings.theme is None

    def test_exclude_unset_works(self):
        """Ensure partial updates only include provided fields."""
        settings = SettingsUpdate(currency="GBP")
        dumped = settings.model_dump(exclude_unset=True)
        assert "currency" in dumped
        assert "theme" not in dumped
