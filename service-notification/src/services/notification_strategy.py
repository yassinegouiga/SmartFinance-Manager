

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
    async def send(self, db, user_id: str, title: str, message: str, email: str, html: str) -> None:
        from src.services.email_service import send_email
        send_email(email, title, html)


class InAppNotificationStrategy(NotificationStrategy):
    async def send(self, db, user_id: str, title: str, message: str, email: str, html: str) -> None:
        logger.info(f"In-app notification queued for user={user_id}: {title}")


class DualNotificationStrategy(NotificationStrategy):
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
