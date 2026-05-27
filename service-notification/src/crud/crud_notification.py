from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update

from src.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    type: str,
    reference_key: Optional[str] = None,
) -> Optional[Notification]:
    """Create a notification, skipping if reference_key already exists."""
    if reference_key:
        existing = await db.execute(
            select(Notification).where(Notification.reference_key == reference_key)
        )
        if existing.scalars().first():
            return None

    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        reference_key=reference_key,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


async def get_notifications(
    db: AsyncSession, user_id: str, limit: int = 20, offset: int = 0
) -> List[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: str) -> int:
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
        )
    )
    return result.scalar() or 0


async def mark_as_read(db: AsyncSession, notification_id: UUID, user_id: str) -> bool:
    result = await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user_id)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount > 0


async def mark_all_read(db: AsyncSession, user_id: str) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
