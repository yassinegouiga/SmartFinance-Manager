from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from src.models.saving_pot import PotStatus

class SavingPotBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0)
    deadline: Optional[datetime] = None

class SavingPotCreate(SavingPotBase):
    pass

class SavingPotUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    deadline: Optional[datetime] = None
    status: Optional[PotStatus] = None

class SavingPotResponse(SavingPotBase):
    id: UUID
    user_id: str
    current_amount: float
    status: PotStatus
    created_at: datetime

    class Config:
        from_attributes = True
