


class SmartFinanceError(Exception):

    def __init__(self, message: str = "An unexpected error occurred."):
        self.message = message
        super().__init__(self.message)


class NotFoundError(SmartFinanceError):

    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail += f": {identifier}"
        super().__init__(detail)


class UnauthorizedError(SmartFinanceError):

    def __init__(self, message: str = "Authentication required."):
        super().__init__(message)


class ForbiddenError(SmartFinanceError):

    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(message)


class ConflictError(SmartFinanceError):

    def __init__(self, message: str = "Resource already exists."):
        super().__init__(message)


class ValidationError(SmartFinanceError):

    def __init__(self, message: str = "Validation failed."):
        super().__init__(message)
