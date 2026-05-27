"""
Strategy Pattern — defines a family of notification-delivery algorithms so the
scheduler can swap between them at runtime without changing its own logic.

Strategies:
  EmailNotificationStrategy  — send only via email (urgent alerts)
  InAppNotificationStrategy  — store only in DB  (low-priority info)
  DualNotificationStrategy   — both email + in-app (high-priority events)

Usage:
    context = NotificationContext(DualNotificationStrategy())
    await context.notify(db, user_id, title, message, email, html)
"""

from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("notification-service.strategy")


class NotificationStrategy(ABC):
    @abstractmethod
    async def send(
        self, db, user_id: str, title: str, message: str, email: str, html: str
    ) -> None:
        pass


class EmailNotificationStrategy(NotificationStrategy):
    """Delivers only via email — for time-sensitive alerts."""

    async def send(self, db, user_id: str, title: str, message: str, email: str, html: str) -> None:
        from src.services.email_service import send_email
        send_email(email, title, html)


class InAppNotificationStrategy(NotificationStrategy):
    """Stores only in the database — for informational, non-urgent events."""

    async def send(self, db, user_id: str, title: str, message: str, email: str, html: str) -> None:
        logger.info(f"In-app notification queued for user={user_id}: {title}")


class DualNotificationStrategy(NotificationStrategy):
    """Delivers via email AND stores in-app — for high-priority events."""

    async def send(self, db, user_id: str, title: str, message: str, email: str, html: str) -> None:
        from src.services.email_service import send_email
        send_email(email, title, html)
        logger.info(f"In-app notification stored for user={user_id}: {title}")


class NotificationContext:
    def __init__(self, strategy: NotificationStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: NotificationStrategy) -> None:
        self._strategy = strategy

    async def notify(
        self, db, user_id: str, title: str, message: str, email: str, html: str
    ) -> None:
        await self._strategy.send(db, user_id, title, message, email, html)
