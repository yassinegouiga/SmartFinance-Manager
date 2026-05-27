from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from src.models.transaction import Transaction
from src.schemas.transaction import TransactionCreate, TransactionUpdate
from src.utils.audit_decorator import audit_log

async def get_transaction(db: AsyncSession, transaction_id: UUID, user_id: str) -> Optional[Transaction]:
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id
        )
    )
    return result.scalars().first()

async def get_transactions(
    db: AsyncSession, 
    user_id: str, 
    skip: int = 0, 
    limit: int = 100
) -> List[Transaction]:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(desc(Transaction.date))
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())

@audit_log("CREATE")
async def create_transaction(db: AsyncSession, transaction: TransactionCreate, user_id: str) -> Transaction:
    db_transaction = Transaction(**transaction.model_dump(), user_id=user_id)
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

@audit_log("UPDATE")
async def update_transaction(
    db: AsyncSession,
    db_transaction: Transaction,
    transaction: TransactionUpdate
) -> Transaction:
    update_data = transaction.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_transaction, key, value)

    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

@audit_log("DELETE")
async def delete_transaction(db: AsyncSession, db_transaction: Transaction) -> None:
    await db.delete(db_transaction)
    await db.commit()
