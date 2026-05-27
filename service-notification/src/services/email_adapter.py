"""
Adapter Pattern — decouples the application from the Resend SDK.

EmailProvider is the target interface the rest of the code depends on.
ResendAdapter wraps (adapts) the Resend library to match that interface.
Swapping email providers only requires a new adapter class — no other changes.
"""

from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("notification-service.email")


class EmailProvider(ABC):
    """Target interface — what the application talks to."""

    @abstractmethod
    def send(self, to: str, subject: str, html: str) -> bool:
        pass


class ResendAdapter(EmailProvider):
    """Adapts the Resend SDK to the EmailProvider interface."""

    def __init__(self, api_key: str, from_address: str):
        import resend
        self._resend = resend
        self._resend.api_key = api_key
        self._from = from_address

    def send(self, to: str, subject: str, html: str) -> bool:
        try:
            self._resend.Emails.send({
                "from": self._from,
                "to": [to],
                "subject": subject,
                "html": html,
            })
            logger.info(f"Email sent to {to}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False
