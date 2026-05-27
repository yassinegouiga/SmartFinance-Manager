"""
Bridge Pattern — separates WHAT the notification is (type hierarchy)
from HOW it is delivered (channel hierarchy).

Both hierarchies can vary independently:
  - Add a new notification type (e.g. GoalReminder) without touching channels.
  - Add a new channel (e.g. PushChannel) without touching notification types.

Abstraction (notification types)     Implementation (delivery channels)
─────────────────────────────────    ──────────────────────────────────
NotificationBase                     DeliveryChannel
  BudgetAlertNotification              EmailChannel
  BillReminderNotification             InAppChannel
  LargeTransactionNotification
"""

from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("notification-service.bridge")


# ── Implementation side ───────────────────────────────────────────────────────

class DeliveryChannel(ABC):
    @abstractmethod
    def deliver(self, email: str, subject: str, html: str) -> None:
        pass


class EmailChannel(DeliveryChannel):
    """Sends via the configured transactional email provider."""

    def deliver(self, email: str, subject: str, html: str) -> None:
        from src.services.email_service import send_email
        send_email(email, subject, html)


class InAppChannel(DeliveryChannel):
    """Records the event without sending an email."""

    def deliver(self, email: str, subject: str, html: str) -> None:
        logger.info(f"In-app delivery to {email}: {subject}")


# ── Abstraction side ──────────────────────────────────────────────────────────

class NotificationBase(ABC):
    def __init__(self, channel: DeliveryChannel):
        self._channel = channel     # bridge to implementation

    @abstractmethod
    def send(self, email: str, **kwargs) -> None:
        pass


class BudgetAlertNotification(NotificationBase):
    def send(self, email: str, first_name: str, pct: int, limit: float, spent: float) -> None:
        from src.services.email_service import budget_warning_html
        subject = "Budget exceeded!" if pct >= 100 else f"Budget warning: {pct}% used"
        html = budget_warning_html(first_name, pct, limit, spent)
        self._channel.deliver(email, subject, html)


class BillReminderNotification(NotificationBase):
    def send(self, email: str, first_name: str, bill_name: str, amount: float, due_date: str) -> None:
        from src.services.email_service import bill_due_soon_html
        subject = f"Reminder: {bill_name} is due soon"
        html = bill_due_soon_html(first_name, bill_name, amount, due_date)
        self._channel.deliver(email, subject, html)


class LargeTransactionNotification(NotificationBase):
    def send(self, email: str, first_name: str, amount: float, description: str) -> None:
        from src.services.email_service import large_transaction_html
        subject = f"Large transaction alert: ${amount:,.2f}"
        html = large_transaction_html(first_name, amount, description)
        self._channel.deliver(email, subject, html)
