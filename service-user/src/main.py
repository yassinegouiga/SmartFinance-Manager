

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.core.database import engine
from src.models.base import Base
from src.api.v1.router import router as users_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("user-service")



@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting User Service...")

    async with engine.begin() as conn:
        await conn.execute(
            __import__("sqlalchemy").text("CREATE SCHEMA IF NOT EXISTS user_service")
        )
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database tables ready.")
    yield


    await engine.dispose()
    logger.info("User Service shut down.")



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


app.include_router(users_router, prefix=settings.API_V1_PREFIX)



@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "user-service"}
