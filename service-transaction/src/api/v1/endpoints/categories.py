from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_id, get_db
from src.crud import crud_category
from src.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def read_categories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await crud_category.get_categories(db, user_id=user_id, skip=skip, limit=limit)


@router.get("/{category_id}", response_model=CategoryResponse)
async def read_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_category = await crud_category.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return await crud_category.create_category(db=db, category=category, user_id=user_id)


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_category = await crud_category.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if db_category.user_id is None:
        raise HTTPException(status_code=403, detail="Cannot modify default categories.")
    if db_category.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this category.")
    return await crud_category.update_category(db=db, db_category=db_category, category=category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    db_category = await crud_category.get_category(db, category_id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    if db_category.user_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete default categories.")
    if db_category.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this category.")
    count = await crud_category.get_transaction_count_for_category(db, category_id)
    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {count} transaction(s) use this category. Reassign them first.",
        )
    await crud_category.delete_category(db=db, db_category=db_category)
