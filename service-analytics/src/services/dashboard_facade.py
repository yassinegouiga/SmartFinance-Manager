"""
Facade Pattern — exposes a single, simple interface over the analytics subsystem.

Without the facade, every caller must know about crud_analytics, the Composite
report builder, and how to assemble the final response.  With it, one call does
all of that.
"""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.crud import crud_analytics
from src.services.report_composite import FinancialReport, IncomeReport, ExpenseReport, BalanceReport


class DashboardFacade:
    async def get_full_dashboard(self, db: AsyncSession, user_id: str) -> dict:
        """Fetch summary + notifications and build the composite report in one call."""
        now = datetime.now()

        summary = await crud_analytics.get_or_create_monthly_summary(
            db, user_id, now.month, now.year
        )
        notifications = await crud_analytics.get_unread_notifications(db, user_id)

        report = FinancialReport()
        report.add(IncomeReport())
        report.add(ExpenseReport())
        report.add(BalanceReport())
        breakdown = report.calculate(summary)

        return {
            "summary": summary,
            "breakdown": breakdown,
            "notifications": notifications,
            "unread_count": len(notifications),
        }

    async def mark_all_caught_up(self, db: AsyncSession, user_id: str) -> int:
        """Mark every unread notification as read; returns count cleared."""
        notifications = await crud_analytics.get_unread_notifications(db, user_id)
        for notif in notifications:
            await crud_analytics.mark_notification_read(db, notif.id, user_id)
        return len(notifications)


dashboard_facade = DashboardFacade()
