from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from src.models.saving_pot import SavingPot
from src.schemas.saving_pot import SavingPotCreate, SavingPotUpdate

async def create_saving_pot(db: AsyncSession, pot: SavingPotCreate, user_id: str) -> SavingPot:
    db_pot = SavingPot(**pot.model_dump(), user_id=user_id)
    db.add(db_pot)
    await db.commit()
    await db.refresh(db_pot)
    return db_pot

async def get_saving_pot(db: AsyncSession, pot_id: UUID, user_id: str) -> SavingPot | None:
    result = await db.execute(select(SavingPot).filter(SavingPot.id == pot_id, SavingPot.user_id == user_id))
    return result.scalars().first()

async def get_saving_pots(db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100) -> list[SavingPot]:
    result = await db.execute(select(SavingPot).filter(SavingPot.user_id == user_id).offset(skip).limit(limit))
    return list(result.scalars().all())

async def update_saving_pot(db: AsyncSession, db_pot: SavingPot, pot_update: SavingPotUpdate) -> SavingPot:
    update_data = pot_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pot, key, value)
    await db.commit()
    await db.refresh(db_pot)
    return db_pot

async def update_saving_pot_amount(db: AsyncSession, db_pot: SavingPot, amount_change: float) -> SavingPot:
    db_pot.current_amount += amount_change
    await db.commit()
    await db.refresh(db_pot)
    return db_pot

async def delete_saving_pot(db: AsyncSession, db_pot: SavingPot) -> None:
    await db.delete(db_pot)
    await db.commit()
