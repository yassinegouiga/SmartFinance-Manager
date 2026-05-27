"""
SQLAlchemy declarative base for the Transaction Service schema.
All models in this service inherit from this Base class.
"""

from sqlalchemy.orm import DeclarativeBase, declared_attr

class Base(DeclarativeBase):
    """Base class for all Transaction Service ORM models."""
    
    @declared_attr.directive
    def __table_args__(cls):
        return {"schema": "transaction_service"}
