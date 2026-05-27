from typing import List, Optional
from uuid import UUID
from sqlalchemy import or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.models.category import Category
from src.schemas.category import CategoryCreate, CategoryUpdate


async def get_category(db: AsyncSession, category_id: UUID) -> Optional[Category]:
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalars().first()


async def get_categories(db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100) -> List[Category]:
    result = await db.execute(
        select(Category)
        .where(or_(Category.user_id == None, Category.user_id == user_id))
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_category(db: AsyncSession, category: CategoryCreate, user_id: str) -> Category:
    db_category = Category(**category.model_dump(), user_id=user_id)
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


async def update_category(db: AsyncSession, db_category: Category, category: CategoryUpdate) -> Category:
    for key, value in category.model_dump(exclude_unset=True).items():
        setattr(db_category, key, value)
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


async def delete_category(db: AsyncSession, db_category: Category) -> None:
    await db.delete(db_category)
    await db.commit()


async def get_transaction_count_for_category(db: AsyncSession, category_id: UUID) -> int:
    from src.models.transaction import Transaction
    result = await db.execute(
        select(func.count()).where(Transaction.category_id == category_id)
    )
    return result.scalar() or 0


async def seed_categories(db: AsyncSession) -> None:
    import logging
    from src.schemas.category import CategoryTypeSchema
    from src.utils.category_flyweight import CategoryIconPool

    logger = logging.getLogger("transaction-service")

    result = await db.execute(select(Category).where(Category.user_id == None).limit(1))
    if result.scalars().first() is not None:
        return

    default_categories = [
        {"name": "Groceries",      "type": CategoryTypeSchema.EXPENSE, "icon": "shopping-cart", "color": "#10B981"},
        {"name": "Rent",           "type": CategoryTypeSchema.EXPENSE, "icon": "home",           "color": "#EF4444"},
        {"name": "Utilities",      "type": CategoryTypeSchema.EXPENSE, "icon": "zap",            "color": "#F59E0B"},
        {"name": "Entertainment",  "type": CategoryTypeSchema.EXPENSE, "icon": "film",           "color": "#8B5CF6"},
        {"name": "Transport",      "type": CategoryTypeSchema.EXPENSE, "icon": "car",            "color": "#3B82F6"},
        {"name": "Salary",         "type": CategoryTypeSchema.INCOME,  "icon": "dollar-sign",   "color": "#10B981"},
        {"name": "Investments",    "type": CategoryTypeSchema.INCOME,  "icon": "trending-up",   "color": "#6366F1"},
        {"name": "Gifts",          "type": CategoryTypeSchema.INCOME,  "icon": "gift",          "color": "#EC4899"},
    ]
    for cat_data in default_categories:
        # Flyweight: share CategoryMeta instances for identical icon/color combos
        meta = CategoryIconPool.get(cat_data["icon"], cat_data["color"])
        db.add(Category(name=cat_data["name"], type=cat_data["type"], icon=meta.icon, color=meta.color))

    await db.commit()
    logger.info(f"Default categories seeded. Flyweight pool size: {CategoryIconPool.pool_size()} unique icon/color pairs.")
