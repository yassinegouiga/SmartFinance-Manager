from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from src.models.pot_transaction import TransactionType

class PotTransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)

class PotTransactionResponse(BaseModel):
    id: UUID
    pot_id: UUID
    type: TransactionType
    amount: float
    date: datetime

    class Config:
        from_attributes = True
