

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




@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await update_user(db, current_user, user_in)




@router.get("/me/settings", response_model=SettingsResponse)
async def get_settings(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@router.put("/me/settings", response_model=SettingsResponse)
async def update_my_settings(
    settings_in: SettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await update_settings(db, current_user, settings_in)




@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await delete_user(db, current_user)
