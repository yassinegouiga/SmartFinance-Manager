import uuid
from sqlalchemy import Column, Float, DateTime, func, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import enum
from src.models.base import Base

class TransactionType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"

class PotTransaction(Base):
    __tablename__ = "pot_transactions"
    import os
    __table_args__ = {"schema": "budget_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fk_target = "budget_service.saving_pots.id" if not os.environ.get("TESTING") else "saving_pots.id"
    pot_id = Column(UUID(as_uuid=True), ForeignKey(fk_target, ondelete="CASCADE"), index=True, nullable=False)
    type = Column(Enum(TransactionType, schema="budget_service" if not os.environ.get("TESTING") else None), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
