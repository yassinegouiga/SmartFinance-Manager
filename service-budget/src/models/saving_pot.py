import uuid
from sqlalchemy import Column, String, Float, DateTime, func, Enum
from sqlalchemy.dialects.postgresql import UUID
import enum
from src.models.base import Base

class PotStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

class SavingPot(Base):
    __tablename__ = "saving_pots"
    import os
    __table_args__ = {"schema": "budget_service"} if not os.environ.get("TESTING") else None

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(PotStatus, schema="budget_service" if not os.environ.get("TESTING") else None), default=PotStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
