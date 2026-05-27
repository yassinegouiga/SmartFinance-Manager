from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class BudgetBase(BaseModel):
    category_id: UUID
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    monthly_limit: float = Field(..., gt=0)
    alert_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = Field(None, gt=0)
    alert_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)

class BudgetResponse(BudgetBase):
    id: UUID
    user_id: str
    spent_amount: float
    created_at: datetime

    class Config:
        from_attributes = True
