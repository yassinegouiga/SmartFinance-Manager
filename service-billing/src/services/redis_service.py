"""
Redis publisher for the Billing Service.
Publishes BillDue and BillOverdue events for the Analytics/Notification service to consume.
"""

import json
import logging
import redis.asyncio as redis

from src.core.config import settings

logger = logging.getLogger("billing-service.redis")


class RedisPublisher:
    def __init__(self):
        self.redis_client = None

    async def connect(self):
        if not self.redis_client:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")

    async def disconnect(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")

    async def publish(self, channel: str, data: dict):
        """Generic publish method used by the scheduler."""
        if not self.redis_client:
            await self.connect()
        await self.redis_client.publish(channel, json.dumps(data))
        logger.info(f"Published event to {channel}")

    async def publish_bill_due(self, user_id: str, bill_id: str, bill_name: str, amount: float, due_day: int):
        """Publish a BillDue event when a bill is approaching its due date."""
        if not self.redis_client:
            return

        event_data = {
            "user_id": user_id,
            "bill_id": bill_id,
            "bill_name": bill_name,
            "amount": amount,
            "due_day": due_day,
        }
        await self.redis_client.publish("BillDue", json.dumps(event_data))
        logger.info(f"Published BillDue for bill {bill_id} ({bill_name})")

    async def publish_bill_overdue(self, user_id: str, bill_id: str, bill_name: str, amount: float):
        """Publish a BillOverdue event when a bill passes its due date without payment."""
        if not self.redis_client:
            return

        event_data = {
            "user_id": user_id,
            "bill_id": bill_id,
            "bill_name": bill_name,
            "amount": amount,
        }
        await self.redis_client.publish("bill.overdue", json.dumps(event_data))
        logger.info(f"Published BillOverdue for bill {bill_id} ({bill_name})")

    async def publish_bill_paid(self, user_id: str, bill_id: str, bill_name: str, amount: float):
        """Publish a BillPaid event for analytics tracking."""
        if not self.redis_client:
            return

        event_data = {
            "user_id": user_id,
            "bill_id": bill_id,
            "bill_name": bill_name,
            "amount": amount,
        }
        await self.redis_client.publish("BillPaid", json.dumps(event_data))
        logger.info(f"Published BillPaid for bill {bill_id} ({bill_name})")


redis_publisher = RedisPublisher()
