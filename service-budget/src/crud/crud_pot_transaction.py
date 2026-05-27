from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from src.models.pot_transaction import PotTransaction, TransactionType

async def create_pot_transaction(db: AsyncSession, pot_id: UUID, amount: float, type: TransactionType) -> PotTransaction:
    db_transaction = PotTransaction(pot_id=pot_id, amount=amount, type=type)
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    return db_transaction

async def get_pot_transactions(db: AsyncSession, pot_id: UUID, skip: int = 0, limit: int = 100) -> list[PotTransaction]:
    result = await db.execute(
        select(PotTransaction)
        .filter(PotTransaction.pot_id == pot_id)
        .order_by(PotTransaction.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
