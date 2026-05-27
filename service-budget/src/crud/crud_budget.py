from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from uuid import UUID

from src.models.budget import Budget
from src.schemas.budget import BudgetCreate, BudgetUpdate

async def create_budget(db: AsyncSession, budget: BudgetCreate, user_id: str) -> Budget:
    db_budget = Budget(**budget.model_dump(), user_id=user_id)
    db.add(db_budget)
    await db.commit()
    await db.refresh(db_budget)
    return db_budget

async def get_budget(db: AsyncSession, budget_id: UUID, user_id: str) -> Budget | None:
    result = await db.execute(select(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id))
    return result.scalars().first()

async def get_budgets(db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100) -> list[Budget]:
    result = await db.execute(select(Budget).filter(Budget.user_id == user_id).offset(skip).limit(limit))
    return list(result.scalars().all())

async def update_budget(db: AsyncSession, db_budget: Budget, budget_update: BudgetUpdate) -> Budget:
    update_data = budget_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_budget, key, value)
    await db.commit()
    await db.refresh(db_budget)
    return db_budget

async def delete_budget(db: AsyncSession, db_budget: Budget) -> None:
    await db.delete(db_budget)
    await db.commit()

async def update_budget_spent_amount(db: AsyncSession, user_id: str, category_id: UUID, month: int, year: int, amount_change: float) -> Budget | None:
    result = await db.execute(select(Budget).filter(
        Budget.user_id == user_id, 
        Budget.category_id == category_id,
        Budget.month == month,
        Budget.year == year
    ))
    db_budget = result.scalars().first()
    
    if db_budget:
        db_budget.spent_amount += amount_change
        await db.commit()
        await db.refresh(db_budget)
        return db_budget
    return None
