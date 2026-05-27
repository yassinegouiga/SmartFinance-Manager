"""
Pydantic schemas (DTOs) for the Billing Service.
"""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from enum import Enum


class BillStatus(str, Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"
    OVERDUE = "OVERDUE"


class BillFrequency(str, Enum):
    MONTHLY = "MONTHLY"
    WEEKLY = "WEEKLY"
    YEARLY = "YEARLY"
    ONE_TIME = "ONE_TIME"


class BillBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Netflix"])
    amount: float = Field(..., gt=0, examples=[15.99])
    due_day: int = Field(..., ge=1, le=31, examples=[15])
    frequency: BillFrequency = Field(default=BillFrequency.MONTHLY)
    is_recurring: bool = Field(default=True)
    icon: Optional[str] = Field(None, max_length=50, examples=["tv"])
    color: Optional[str] = Field(None, max_length=7, examples=["#FF6347"])
    auto_pay: bool = Field(default=False)
    next_due_date: Optional[datetime] = None


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[float] = Field(None, gt=0)
    due_day: Optional[int] = Field(None, ge=1, le=31)
    frequency: Optional[BillFrequency] = None
    is_recurring: Optional[bool] = None
    status: Optional[BillStatus] = None
    icon: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    auto_pay: Optional[bool] = None
    next_due_date: Optional[datetime] = None


class BillResponse(BillBase):
    id: UUID
    user_id: str
    status: BillStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
