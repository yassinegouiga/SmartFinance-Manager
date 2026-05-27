import asyncio
import json
import logging
from datetime import datetime

from src.core.database import AsyncSessionLocal
from src.crud import crud_analytics
from src.models.analytics import NotificationType
from src.services.redis_service import redis_client

logger = logging.getLogger("analytics-service.event_listener")

async def process_transaction_event(data: dict, is_delete: bool = False):
    user_id = data.get("user_id")
    amount = data.get("amount", 0.0)
    tx_type = data.get("type", "EXPENSE")
    date_str = data.get("date") # Assuming ISO format

    if not all([user_id, date_str]):
        logger.warning(f"Invalid transaction event payload: {data}")
        return

    try:
        date_obj = datetime.fromisoformat(date_str)
        async with AsyncSessionLocal() as db:
            await crud_analytics.update_monthly_totals(
                db, user_id=user_id, amount=amount, tx_type=tx_type, date_obj=date_obj, is_delete=is_delete
            )
            logger.info(f"Updated monthly summary for user {user_id}")
    except Exception as e:
        logger.error(f"Error processing transaction event: {e}")


async def process_notification_event(data: dict, notif_type: NotificationType):
    user_id = data.get("user_id")
    if not user_id:
        return
        
    message = ""
    if notif_type == NotificationType.BUDGET_EXCEEDED:
        category = data.get("category_id", "Unknown")
        message = f"You have exceeded your budget for category {category}."
    elif notif_type == NotificationType.BILL_OVERDUE:
        bill_name = data.get("name", "Unknown")
        message = f"Your bill '{bill_name}' is overdue."

    if message:
        try:
            async with AsyncSessionLocal() as db:
                await crud_analytics.create_notification(db, user_id=user_id, notif_type=notif_type, message=message)
                logger.info(f"Created {notif_type} notification for user {user_id}")
        except Exception as e:
            logger.error(f"Error creating notification: {e}")


async def listen_to_redis_events():
    """Background task to listen to Redis channels."""
    if not redis_client.redis:
        logger.error("Redis client not connected.")
        return

    pubsub = redis_client.redis.pubsub()
    channels = ["transaction.created", "transaction.deleted", "budget.exceeded", "bill.overdue"]
    
    await pubsub.subscribe(*channels)
    logger.info(f"Subscribed to Redis channels: {channels}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                channel = message["channel"]
                try:
                    data = json.loads(message["data"])
                    logger.info(f"Received event on {channel}: {data}")

                    if channel == "transaction.created":
                        await process_transaction_event(data, is_delete=False)
                    elif channel == "transaction.deleted":
                        await process_transaction_event(data, is_delete=True)
                    elif channel == "budget.exceeded":
                        await process_notification_event(data, NotificationType.BUDGET_EXCEEDED)
                    elif channel == "bill.overdue":
                        await process_notification_event(data, NotificationType.BILL_OVERDUE)
                        
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON from {channel}: {message['data']}")
                except Exception as e:
                    logger.error(f"Unexpected error handling message from {channel}: {e}")
    except asyncio.CancelledError:
        logger.info("Redis listener cancelled.")
    finally:
        await pubsub.unsubscribe(*channels)
        await pubsub.close()
