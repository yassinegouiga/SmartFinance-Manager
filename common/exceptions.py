"""
Shared custom exception classes for all SmartFinance microservices.

These provide semantic error handling across services, decoupled
from HTTP status codes (which are mapped in exception handlers).
"""


class SmartFinanceError(Exception):
    """Base exception for all SmartFinance application errors."""

    def __init__(self, message: str = "An unexpected error occurred."):
        self.message = message
        super().__init__(self.message)


class NotFoundError(SmartFinanceError):
    """Raised when a requested resource does not exist."""

    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail += f": {identifier}"
        super().__init__(detail)


class UnauthorizedError(SmartFinanceError):
    """Raised when authentication fails or is missing."""

    def __init__(self, message: str = "Authentication required."):
        super().__init__(message)


class ForbiddenError(SmartFinanceError):
    """Raised when the user lacks permission for the requested action."""

    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(message)


class ConflictError(SmartFinanceError):
    """Raised when a resource already exists (e.g., duplicate email)."""

    def __init__(self, message: str = "Resource already exists."):
        super().__init__(message)


class ValidationError(SmartFinanceError):
    """Raised when input data fails business-rule validation."""

    def __init__(self, message: str = "Validation failed."):
        super().__init__(message)
