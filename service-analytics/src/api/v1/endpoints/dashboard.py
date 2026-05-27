from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_analytics
from src.schemas.analytics import DashboardSummaryResponse, NotificationResponse, BreakdownResponse
from src.services.dashboard_facade import dashboard_facade

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get the current month's financial summary and unread notifications count."""
    data = await dashboard_facade.get_full_dashboard(db, user_id)
    return DashboardSummaryResponse(
        current_month_summary=data["summary"],
        unread_notifications_count=data["unread_count"],
        breakdown=BreakdownResponse(**data["breakdown"]),
    )

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get all unread notifications for the user."""
    return await crud_analytics.get_unread_notifications(db, user_id)

@router.post("/notifications/{notif_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notif_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Mark a specific notification as read."""
    notif = await crud_analytics.mark_notification_read(db, notif_id, user_id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notif
