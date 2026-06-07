
import functools
import logging

logger = logging.getLogger("transaction-service.audit")


def audit_log(operation: str):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            obj = result or next((a for a in args if hasattr(a, "id") and hasattr(a, "user_id")), None)
            record_id = getattr(obj, "id", "n/a")
            user_id  = getattr(obj, "user_id", "n/a")

            logger.info(f"AUDIT | op={operation} | id={record_id} | user={user_id}")
            return result

        return wrapper
    return decorator
