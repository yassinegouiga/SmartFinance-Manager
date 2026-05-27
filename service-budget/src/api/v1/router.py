from fastapi import APIRouter
from src.api.v1.endpoints import budgets, saving_pots

api_router = APIRouter()
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(saving_pots.router, prefix="/saving-pots", tags=["saving-pots"])
