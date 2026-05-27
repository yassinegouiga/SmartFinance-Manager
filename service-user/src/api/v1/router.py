"""
User Service API v1 router.

Endpoints (from architecture_design.md §6 & §3):
    GET    /api/v1/users/me           → Get current user profile
    PUT    /api/v1/users/me           → Update profile (first_name, last_name)
    GET    /api/v1/users/me/settings  → Get user preferences
    PUT    /api/v1/users/me/settings  → Update preferences (currency, theme)
    DELETE /api/v1/users/me           → Delete user account
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user, get_db
from src.crud.user import update_user, update_settings, delete_user
from src.models.user import User
from src.schemas.user import (
    UserResponse,
    UserUpdate,
    SettingsResponse,
    SettingsUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Profile Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Return the authenticated user's full profile.
    Auto-creates the user record on first call (onboarding).
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update the authenticated user's profile fields."""
    return await update_user(db, current_user, user_in)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Settings Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/me/settings", response_model=SettingsResponse)
async def get_settings(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return the authenticated user's preference settings."""
    return current_user


@router.put("/me/settings", response_model=SettingsResponse)
async def update_my_settings(
    settings_in: SettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update the authenticated user's preference settings."""
    return await update_settings(db, current_user, settings_in)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Account Management
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Permanently delete the authenticated user's account."""
    await delete_user(db, current_user)
