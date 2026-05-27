from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_transaction, crud_category
from src.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from src.services.redis_service import redis_publisher

router = APIRouter()

@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Verify category exists
    category = await crud_category.get_category(db, category_id=transaction.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    db_transaction = await crud_transaction.create_transaction(db=db, transaction=transaction, user_id=user_id)
    
    # Publish event
    await redis_publisher.publish_event("transaction.created", {
        "id": str(db_transaction.id),
        "user_id": user_id,
        "amount": db_transaction.amount,
        "type": db_transaction.type,
        "category_id": str(db_transaction.category_id),
        "date": db_transaction.date.isoformat()
    })
    
    return db_transaction

@router.get("/", response_model=List[TransactionResponse])
async def read_transactions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    transactions = await crud_transaction.get_transactions(db, user_id=user_id, skip=skip, limit=limit)
    return transactions

@router.get("/export/csv")
async def export_transactions_csv(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    transactions = await crud_transaction.get_transactions(db, user_id=user_id, skip=0, limit=10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Amount", "Type", "Category ID", "Date", "Description", "Is Recurring"])
    
    # Write data
    for t in transactions:
        writer.writerow([
            str(t.id),
            t.amount,
            t.type.value if hasattr(t.type, 'value') else t.type,
            str(t.category_id),
            t.date.isoformat() if t.date else "",
            t.description or "",
            t.is_recurring
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"}
    )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def read_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_transaction = await crud_transaction.get_transaction(db, transaction_id=transaction_id, user_id=user_id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_transaction

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    transaction: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_transaction = await crud_transaction.get_transaction(db, transaction_id=transaction_id, user_id=user_id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if transaction.category_id:
        category = await crud_category.get_category(db, category_id=transaction.category_id)
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
            
    updated_transaction = await crud_transaction.update_transaction(db=db, db_transaction=db_transaction, transaction=transaction)
    
    # We could publish TransactionUpdated here if needed by other services
    return updated_transaction

@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_transaction = await crud_transaction.get_transaction(db, transaction_id=transaction_id, user_id=user_id)
    if db_transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    await crud_transaction.delete_transaction(db=db, db_transaction=db_transaction)
    
    await redis_publisher.publish_event("transaction.deleted", {
        "id": str(transaction_id),
        "user_id": user_id,
        "amount": db_transaction.amount,
        "type": db_transaction.type,
        "category_id": str(db_transaction.category_id),
        "date": db_transaction.date.isoformat()
    })
