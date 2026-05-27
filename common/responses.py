"""
Standardized API response models for all SmartFinance microservices.

Ensures every service returns consistent JSON shapes for
success, error, and paginated responses.
"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    """Standard wrapper for successful responses."""
    success: bool = True
    data: T
    message: str = "OK"


class ErrorResponse(BaseModel):
    """Standard wrapper for error responses."""
    success: bool = False
    error: str
    detail: str | None = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard wrapper for paginated list responses."""
    success: bool = True
    data: list[T]  # type: ignore[type-var]
    total: int
    page: int
    page_size: int
    total_pages: int
