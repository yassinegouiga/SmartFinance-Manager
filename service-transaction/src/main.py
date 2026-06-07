

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.database import engine
from src.models.base import Base
from src.api.v1.endpoints import transactions, categories


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("transaction-service")



@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Transaction Service...")

    from src.services.redis_service import redis_publisher
    await redis_publisher.connect()

    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS transaction_service")
        )
        await conn.run_sync(Base.metadata.create_all)


    from src.core.database import AsyncSessionLocal
    from src.crud.crud_category import seed_categories
    async with AsyncSessionLocal() as session:
        await seed_categories(session)

    logger.info("Database tables ready.")
    yield


    await engine.dispose()
    await redis_publisher.disconnect()
    logger.info("Transaction Service shut down.")



app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(transactions.router, prefix=f"{settings.API_V1_PREFIX}/transactions", tags=["Transactions"])
app.include_router(categories.router, prefix=f"{settings.API_V1_PREFIX}/categories", tags=["Categories"])



@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "transaction-service"}
