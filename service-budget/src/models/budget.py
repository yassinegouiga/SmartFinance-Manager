import uuid
from sqlalchemy import Column, String, Float, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from src.models.base import Base

class Budget(Base):
    __tablename__ = "budgets"
    import os
    __table_args__ = {"schema": "budget_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    category_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    monthly_limit = Column(Float, nullable=False)
    spent_amount = Column(Float, default=0.0)
    alert_threshold = Column(Float, nullable=True) # Percentage like 0.8 for 80%
    created_at = Column(DateTime(timezone=True), server_default=func.now())
