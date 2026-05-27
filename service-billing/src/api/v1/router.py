from fastapi import APIRouter
from src.api.v1.endpoints import bills

api_router = APIRouter()
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
