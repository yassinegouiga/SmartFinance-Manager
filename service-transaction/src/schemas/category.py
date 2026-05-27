from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from enum import Enum

class CategoryTypeSchema(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    type: CategoryTypeSchema

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    type: Optional[CategoryTypeSchema] = None

class CategoryResponse(CategoryBase):
    id: UUID
    user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
