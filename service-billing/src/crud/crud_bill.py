"""
CRUD operations for the Bill model.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from typing import Optional

from src.models.bill import Bill, BillStatus
from src.schemas.bill import BillCreate, BillUpdate


async def create_bill(db: AsyncSession, bill: BillCreate, user_id: str) -> Bill:
    """Create a new bill for a user."""
    db_bill = Bill(**bill.model_dump(), user_id=user_id)
    
    # Calculate initial next_due_date if not provided
    if not db_bill.next_due_date:
        from datetime import datetime, date, timedelta
        import calendar
        now = datetime.now()
        try:
            due_date = now.replace(day=min(db_bill.due_day, calendar.monthrange(now.year, now.month)[1]))
            if due_date < now:
                # Due next month
                next_month = now.month + 1 if now.month < 12 else 1
                next_year = now.year if now.month < 12 else now.year + 1
                due_date = due_date.replace(year=next_year, month=next_month, day=min(db_bill.due_day, calendar.monthrange(next_year, next_month)[1]))
            db_bill.next_due_date = due_date
        except ValueError:
            pass

    db.add(db_bill)
    await db.commit()
    await db.refresh(db_bill)
    return db_bill


async def get_bill(db: AsyncSession, bill_id: UUID, user_id: str) -> Bill | None:
    """Get a single bill by ID, scoped to user."""
    result = await db.execute(
        select(Bill).filter(Bill.id == bill_id, Bill.user_id == user_id)
    )
    return result.scalars().first()


async def get_bills(
    db: AsyncSession,
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    status: Optional[BillStatus] = None
) -> list[Bill]:
    """Get all bills for a user, optionally filtered by status."""
    query = select(Bill).filter(Bill.user_id == user_id)
    if status:
        query = query.filter(Bill.status == status)
    query = query.order_by(Bill.due_day).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_upcoming_bills(db: AsyncSession, user_id: str, current_day: int) -> list[Bill]:
    """Get unpaid bills due on or after the current day of the month."""
    result = await db.execute(
        select(Bill)
        .filter(
            Bill.user_id == user_id,
            Bill.status == BillStatus.UNPAID,
            Bill.due_day >= current_day
        )
        .order_by(Bill.due_day)
    )
    return list(result.scalars().all())


async def update_bill(db: AsyncSession, db_bill: Bill, bill_update: BillUpdate) -> Bill:
    """Update an existing bill."""
    update_data = bill_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bill, key, value)
    await db.commit()
    await db.refresh(db_bill)
    return db_bill


async def mark_bill_paid(db: AsyncSession, db_bill: Bill) -> Bill:
    """Mark a bill as PAID."""
    db_bill.status = BillStatus.PAID
    await db.commit()
    await db.refresh(db_bill)
    return db_bill


async def mark_bill_unpaid(db: AsyncSession, db_bill: Bill) -> Bill:
    """Mark a bill as UNPAID (reset for next cycle)."""
    db_bill.status = BillStatus.UNPAID
    await db.commit()
    await db.refresh(db_bill)
    return db_bill


async def delete_bill(db: AsyncSession, db_bill: Bill) -> None:
    """Delete a bill."""
    await db.delete(db_bill)
    await db.commit()


async def get_total_upcoming(db: AsyncSession, user_id: str) -> float:
    """Get the total amount of unpaid bills for a user."""
    from sqlalchemy import func
    result = await db.execute(
        select(func.coalesce(func.sum(Bill.amount), 0.0))
        .filter(Bill.user_id == user_id, Bill.status == BillStatus.UNPAID)
    )
    return float(result.scalar_one())
