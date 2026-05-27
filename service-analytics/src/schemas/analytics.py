from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional
from src.models.analytics import NotificationType

class MonthlySummaryResponse(BaseModel):
    id: UUID
    user_id: str
    month: int
    year: int
    total_income: float
    total_expense: float
    total_balance: float
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: UUID
    user_id: str
    type: NotificationType
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BreakdownResponse(BaseModel):
    total_income: float = 0.0
    total_expense: float = 0.0
    total_balance: float = 0.0
    savings_rate: float = 0.0

class DashboardSummaryResponse(BaseModel):
    current_month_summary: Optional[MonthlySummaryResponse] = None
    unread_notifications_count: int = 0
    breakdown: Optional[BreakdownResponse] = None
