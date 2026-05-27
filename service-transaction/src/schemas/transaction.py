from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class TransactionTypeSchema(str, Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class TransactionBase(BaseModel):
    amount: float = Field(gt=0, description="Amount must be strictly positive")
    type: TransactionTypeSchema
    category_id: UUID
    date: datetime
    description: Optional[str] = None
    is_recurring: bool = False

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionTypeSchema] = None
    category_id: Optional[UUID] = None
    date: Optional[datetime] = None
    description: Optional[str] = None
    is_recurring: Optional[bool] = None

class TransactionResponse(TransactionBase):
    id: UUID
    user_id: str
    
    model_config = ConfigDict(from_attributes=True)
