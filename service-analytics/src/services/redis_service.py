import redis.asyncio as redis
import logging
from src.core.config import settings

logger = logging.getLogger("analytics-service.redis")

class RedisService:
    def __init__(self):
        self.redis = None

    async def connect(self):
        try:
            self.redis = await redis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

redis_client = RedisService()
