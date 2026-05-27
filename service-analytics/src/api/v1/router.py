from fastapi import APIRouter
from src.api.v1.endpoints import dashboard

api_router = APIRouter()
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
