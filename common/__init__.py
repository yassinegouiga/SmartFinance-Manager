"""
SmartFinance Common Modules.

Shared utilities copied into each microservice during Docker build.
See architecture_design.md §8 for the shared modules strategy.
"""

from common.security import initialize_firebase, verify_firebase_token
from common.exceptions import (
    SmartFinanceError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    ValidationError,
)
from common.responses import SuccessResponse, ErrorResponse, PaginatedResponse

__all__ = [
    "initialize_firebase",
    "verify_firebase_token",
    "SmartFinanceError",
    "NotFoundError",
    "UnauthorizedError",
    "ForbiddenError",
    "ConflictError",
    "ValidationError",
    "SuccessResponse",
    "ErrorResponse",
    "PaginatedResponse",
]
