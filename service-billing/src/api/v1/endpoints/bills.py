

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
    return await crud_bill.create_bill(db=db, bill=bill, user_id=user_id)


@router.get("/", response_model=List[BillResponse])
async def read_bills(
    skip: int = 0,
    limit: int = 100,
    status: Optional[BillStatus] = Query(None, description="Filter by bill status"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    return await crud_bill.get_bills(db, user_id=user_id, skip=skip, limit=limit, status=status)


@router.get("/upcoming", response_model=List[BillResponse])
async def read_upcoming_bills(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    current_day = datetime.now().day
    return await crud_bill.get_upcoming_bills(db, user_id=user_id, current_day=current_day)


@router.get("/summary")
async def read_bills_summary(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
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
    db_bill = await crud_bill.get_bill(db, bill_id=bill_id, user_id=user_id)
    if not db_bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    await crud_bill.delete_bill(db=db, db_bill=db_bill)
