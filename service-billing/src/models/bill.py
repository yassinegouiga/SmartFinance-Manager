"""
Bill model — represents a recurring or one-time bill.

Architecture §14:
  bills (id, user_id, name, amount, due_date, is_recurring, status [paid/unpaid])
"""

import uuid
import enum
import os
from sqlalchemy import Column, String, Float, DateTime, Integer, Boolean, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from src.models.base import Base


class BillStatus(str, enum.Enum):
    PAID = "PAID"
    UNPAID = "UNPAID"
    OVERDUE = "OVERDUE"


class BillFrequency(str, enum.Enum):
    MONTHLY = "MONTHLY"
    WEEKLY = "WEEKLY"
    YEARLY = "YEARLY"
    ONE_TIME = "ONE_TIME"


class Bill(Base):
    __tablename__ = "bills"
    __table_args__ = {"schema": "billing_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String(255), nullable=False)           # e.g. "Netflix", "Rent"
    amount = Column(Float, nullable=False)
    due_day = Column(Integer, nullable=False)             # Day of month (1-31)
    frequency = Column(
        Enum(BillFrequency, schema="billing_service" if not os.environ.get("TESTING") else None),
        nullable=False,
        default=BillFrequency.MONTHLY
    )
    is_recurring = Column(Boolean, default=True)
    status = Column(
        Enum(BillStatus, schema="billing_service" if not os.environ.get("TESTING") else None),
        nullable=False,
        default=BillStatus.UNPAID
    )
    icon = Column(String(50), nullable=True)              # Optional icon identifier
    color = Column(String(7), nullable=True)              # Hex color e.g. "#FF6347"
    auto_pay = Column(Boolean, default=False)
    next_due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
