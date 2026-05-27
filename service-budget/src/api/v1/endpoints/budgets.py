from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_budget
from src.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse

router = APIRouter()

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    # Check if budget already exists for this category/month/year
    existing_budgets = await crud_budget.get_budgets(db, user_id=user_id)
    for b in existing_budgets:
        if b.category_id == budget.category_id and b.month == budget.month and b.year == budget.year:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Budget already exists for this category and month")
    return await crud_budget.create_budget(db=db, budget=budget, user_id=user_id)

@router.get("/", response_model=List[BudgetResponse])
async def read_budgets(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    return await crud_budget.get_budgets(db, user_id=user_id, skip=skip, limit=limit)

@router.get("/{budget_id}", response_model=BudgetResponse)
async def read_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    budget = await crud_budget.get_budget(db, budget_id=budget_id, user_id=user_id)
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return budget

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: UUID,
    budget_update: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_budget = await crud_budget.get_budget(db, budget_id=budget_id, user_id=user_id)
    if not db_budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    return await crud_budget.update_budget(db=db, db_budget=db_budget, budget_update=budget_update)

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    db_budget = await crud_budget.get_budget(db, budget_id=budget_id, user_id=user_id)
    if not db_budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    await crud_budget.delete_budget(db=db, db_budget=db_budget)
