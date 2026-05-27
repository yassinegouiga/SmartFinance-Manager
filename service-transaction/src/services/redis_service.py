import json
import logging
import redis.asyncio as redis
import os

logger = logging.getLogger("transaction-service.redis")

# Using localhost for MVP. In docker, this would be the 'redis' container hostname.
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class RedisPublisher:
    def __init__(self):
        self.redis_client = None

    async def connect(self):
        if not self.redis_client:
            self.redis_client = redis.from_url(REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {REDIS_URL}")

    async def disconnect(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")

    async def publish_event(self, channel: str, event_data: dict):
        try:
            if not self.redis_client:
                await self.connect()
            
            message = json.dumps(event_data)
            await self.redis_client.publish(channel, message)
            logger.info(f"Published event to {channel}: {message}")
        except Exception as e:
            logger.error(f"Failed to publish event to Redis: {e}")

redis_publisher = RedisPublisher()
