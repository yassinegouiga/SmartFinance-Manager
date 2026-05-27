from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_notification
from src.schemas.notification import NotificationResponse, UnreadCountResponse

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await crud_notification.get_notifications(db, user_id=user_id, limit=limit, offset=offset)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    count = await crud_notification.get_unread_count(db, user_id=user_id)
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    success = await crud_notification.mark_as_read(db, notification_id=notification_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await crud_notification.mark_all_read(db, user_id=user_id)
    return {"ok": True}
