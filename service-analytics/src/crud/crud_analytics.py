from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from uuid import UUID
from datetime import datetime

from src.models.analytics import MonthlySummary, Notification, NotificationType

async def get_or_create_monthly_summary(db: AsyncSession, user_id: str, month: int, year: int) -> MonthlySummary:
    query = select(MonthlySummary).filter_by(user_id=user_id, month=month, year=year)
    result = await db.execute(query)
    summary = result.scalars().first()
    
    if not summary:
        summary = MonthlySummary(user_id=user_id, month=month, year=year)
        db.add(summary)
        await db.commit()
        await db.refresh(summary)
    return summary

async def update_monthly_totals(db: AsyncSession, user_id: str, amount: float, tx_type: str, date_obj: datetime, is_delete: bool = False):
    """Updates the monthly total when a transaction is created or deleted."""
    summary = await get_or_create_monthly_summary(db, user_id, date_obj.month, date_obj.year)
    
    multiplier = -1 if is_delete else 1
    
    if tx_type == "INCOME":
        summary.total_income += (amount * multiplier)
    else:
        summary.total_expense += (amount * multiplier)
        
    summary.total_balance = summary.total_income - summary.total_expense
    
    await db.commit()
    await db.refresh(summary)
    return summary

async def create_notification(db: AsyncSession, user_id: str, notif_type: NotificationType, message: str) -> Notification:
    notif = Notification(user_id=user_id, type=notif_type, message=message)
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif

async def get_unread_notifications(db: AsyncSession, user_id: str) -> list[Notification]:
    query = select(Notification).filter_by(user_id=user_id, is_read=False).order_by(Notification.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

async def mark_notification_read(db: AsyncSession, notif_id: UUID, user_id: str) -> Notification | None:
    query = select(Notification).filter_by(id=notif_id, user_id=user_id)
    result = await db.execute(query)
    notif = result.scalars().first()
    if notif:
        notif.is_read = True
        await db.commit()
        await db.refresh(notif)
    return notif
