"""
Pydantic schemas (DTOs) for the User Service.
Strict validation on all incoming payloads as required by security architecture §16.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Request Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class UserCreate(BaseModel):
    """Used internally when auto-creating a user on first Firebase login."""
    firebase_uid: str
    email: str
    first_name: str = ""
    last_name: str = ""
    avatar_url: str | None = None
    auth_provider: str | None = None


class UserUpdate(BaseModel):
    """Fields the user can update on their profile (PUT /me)."""
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    avatar_url: str | None = None


class SettingsUpdate(BaseModel):
    """Fields the user can update in settings (PUT /me/settings)."""
    currency: str | None = Field(None, max_length=10)
    theme: str | None = Field(None, pattern=r"^(light|dark|system)$")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Response Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class UserResponse(BaseModel):
    """Full user profile returned by GET /me and PUT /me."""
    id: UUID
    firebase_uid: str
    email: str
    first_name: str
    last_name: str
    avatar_url: str | None
    auth_provider: str | None
    currency: str
    theme: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingsResponse(BaseModel):
    """User preferences returned by GET/PUT /me/settings."""
    currency: str
    theme: str

    model_config = {"from_attributes": True}
