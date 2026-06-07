

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field




class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    first_name: str = ""
    last_name: str = ""
    avatar_url: str | None = None
    auth_provider: str | None = None


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    avatar_url: str | None = None


class SettingsUpdate(BaseModel):
    currency: str | None = Field(None, max_length=10)
    theme: str | None = Field(None, pattern=r"^(light|dark|system)$")




class UserResponse(BaseModel):
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
    currency: str
    theme: str

    model_config = {"from_attributes": True}
