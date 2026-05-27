from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from src.models.base import Base

class TransactionType(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True) # from firebase
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("transaction_service.categories.id"), nullable=False)
    date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    description = Column(String, nullable=True)
    is_recurring = Column(Boolean, default=False)

    category = relationship("Category", back_populates="transactions")
