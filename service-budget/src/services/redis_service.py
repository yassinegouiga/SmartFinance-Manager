import json
import logging
import asyncio
from datetime import datetime
import redis.asyncio as redis
from uuid import UUID

from src.core.config import settings
from src.core.database import AsyncSessionLocal
from src.crud.crud_budget import update_budget_spent_amount

logger = logging.getLogger("budget-service.redis")

class RedisSubscriber:
    def __init__(self):
        self.redis_client = None
        self.pubsub = None
        self.listen_task = None

    async def connect(self):
        if not self.redis_client:
            self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe("transaction.created", "transaction.deleted")
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")

    async def disconnect(self):
        if self.listen_task:
            self.listen_task.cancel()
        if self.pubsub:
            await self.pubsub.unsubscribe()
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")

    async def start_listening(self):
        await self.connect()
        self.listen_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    data = json.loads(message["data"])
                    await self._handle_event(channel, data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listen loop error: {e}")

    async def _handle_event(self, channel: str, data: dict):
        try:
            user_id = data.get("user_id")
            category_id = UUID(data.get("category_id"))
            amount = float(data.get("amount", 0.0))
            txn_type = data.get("type", "expense")

            # Ignore incomes for budget calculation
            if txn_type.lower() != "expense":
                return

            # Determine amount change (created = add, deleted = subtract)
            if channel == "transaction.created":
                amount_change = amount
            elif channel == "transaction.deleted":
                amount_change = -amount
            else:
                return

            date_str = data.get("date")
            if date_str:
                txn_date = datetime.fromisoformat(date_str)
                month = txn_date.month
                year = txn_date.year
            else:
                now = datetime.now()
                month = now.month
                year = now.year

            async with AsyncSessionLocal() as db:
                budget = await update_budget_spent_amount(
                    db=db,
                    user_id=user_id,
                    category_id=category_id,
                    month=month,
                    year=year,
                    amount_change=amount_change
                )

                if budget and budget.spent_amount > budget.monthly_limit:
                    # Publish BudgetExceeded event
                    await self._publish_budget_exceeded(
                        user_id=user_id,
                        category_id=str(category_id),
                        budget_id=str(budget.id),
                        spent=budget.spent_amount,
                        limit=budget.monthly_limit
                    )
        except Exception as e:
            logger.error(f"Error handling event {channel}: {e}")

    async def _publish_budget_exceeded(self, user_id: str, category_id: str, budget_id: str, spent: float, limit: float):
        if not self.redis_client:
            return
        
        event_data = {
            "user_id": user_id,
            "category_id": category_id,
            "budget_id": budget_id,
            "spent_amount": spent,
            "monthly_limit": limit
        }
        await self.redis_client.publish("budget.exceeded", json.dumps(event_data))
        logger.info(f"Published BudgetExceeded for budget {budget_id}")

redis_subscriber = RedisSubscriber()
