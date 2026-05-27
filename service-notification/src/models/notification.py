import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from src.models.base import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {"schema": "notification_service"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    # Unique key used to prevent duplicate notifications for the same event
    reference_key = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
