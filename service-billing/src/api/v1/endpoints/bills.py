"""
Bill endpoints — CRUD operations for recurring bills management.

Architecture §4 (Billing Service):
  Managing recurring bills, due dates, paid/unpaid statuses,
  and tracking upcoming payments.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_bill
from src.schemas.bill import BillCreate, BillUpdate, BillResponse, BillStatus

router = APIRouter()


@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill: BillCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Create a new bill."""
    return await crud_bill.create_bill(db=db, bill=bill, user_id=user_id)


@router.get("/", response_model=List[BillResponse])
async def read_bills(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BillStatus] = Query(None, description="Filter by bill status"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """List all bills for the current user, optionally filtered by status."""
    return await crud_bill.get_bills(db, user_id=user_id, skip=skip, limit=limit, status=status)


@router.get("/upcoming", response_model=List[BillResponse])
async def read_upcoming_bills(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get all unpaid bills due on or after today's date."""
    current_day = datetime.now().day
    return await crud_bill.get_upcoming_bills(db, user_id=user_id, current_day=current_day)


@router.get("/summary")
async def read_bills_summary(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get a summary of the user's billing status."""
    all_bills = await crud_bill.get_bills(db, user_id=user_id)
    total_upcoming = await crud_bill.get_total_upcoming(db, user_id=user_id)

    paid_count = sum(1 for b in all_bills if b.status.value == "PAID")
    unpaid_count = sum(1 for b in all_bills if b.status.value == "UNPAID")
    overdue_count = sum(1 for b in all_bills if b.status.value == "OVERDUE")

    return {
        "total_bills": len(all_bills),
        "paid": paid_count,
        "unpaid": unpaid_count,
        "overdue": overdue_count,
        "total_upcoming_amount": total_upcoming,
    }


@router.get("/{bill_id}", response_model=BillResponse)
async def read_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific bill by ID."""
    bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return bill


@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: UUID,
    bill_update: BillUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Update a bill's details."""
    db_bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not db_bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return await crud_bill.update_bill(db=db, db_bill=db_bill, bill_update=bill_update)


@router.post("/{bill_id}/pay", response_model=BillResponse)
async def pay_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Mark a bill as paid."""
    db_bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not db_bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return await crud_bill.mark_bill_paid(db=db, db_bill=db_bill)


@router.post("/{bill_id}/reset", response_model=BillResponse)
async def reset_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Reset a bill to unpaid (for next billing cycle)."""
    db_bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not db_bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return await crud_bill.mark_bill_unpaid(db=db, db_bill=db_bill)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a bill."""
    db_bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not db_bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    await crud_bill.delete_bill(db=db, db_bill=db_bill)
