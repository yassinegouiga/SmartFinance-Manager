

from abc import ABC, abstractmethod
import logging

logger = logging.getLogger("notification-service.email")


class EmailProvider(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, html: str) -> bool:
        pass


class ResendAdapter(EmailProvider):
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
