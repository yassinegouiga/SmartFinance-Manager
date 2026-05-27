from sqlalchemy import Column, String, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum

from src.models.base import Base

class CategoryType(str, enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)
    type = Column(Enum(CategoryType), nullable=False)
    # NULL = global/default category; set = user's custom category (firebase_uid)
    user_id = Column(String(128), nullable=True, index=True)

    transactions = relationship("Transaction", back_populates="category")
