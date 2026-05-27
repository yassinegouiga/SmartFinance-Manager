"""
SQLAlchemy declarative base for the User Service schema.
All models in this service inherit from this Base class.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all User Service ORM models."""
    pass
