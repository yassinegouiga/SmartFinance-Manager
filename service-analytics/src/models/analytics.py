import uuid
import enum
import os
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from src.models.base import Base

class NotificationType(str, enum.Enum):
    BUDGET_EXCEEDED = "BUDGET_EXCEEDED"
    BILL_OVERDUE = "BILL_OVERDUE"
    INFO = "INFO"

class MonthlySummary(Base):
    __tablename__ = "monthly_summaries"
    __table_args__ = {"schema": "analytics_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_income = Column(Float, default=0.0)
    total_expense = Column(Float, default=0.0)
    total_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "analytics_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    type = Column(
        Enum(NotificationType, schema="analytics_service" if not os.environ.get("TESTING") else None),
        nullable=False
    )
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
