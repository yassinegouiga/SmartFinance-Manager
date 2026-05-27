"""
Scheduler for the Billing Service.
Runs periodically to check due bills, mark them overdue, and trigger auto-pay.
"""

import asyncio
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import AsyncSessionLocal
from src.models.bill import Bill, BillStatus
from src.services.redis_service import redis_publisher

logger = logging.getLogger("billing-scheduler")


async def check_due_bills():
    """Check for due and overdue bills."""
    logger.info("Scheduler: Checking for due bills...")
    async with AsyncSessionLocal() as db:
        now = datetime.now()
        
        # 1. Check for OVERDUE bills
        overdue_query = select(Bill).filter(
            Bill.status == BillStatus.UNPAID,
            Bill.next_due_date < now
        )
        result = await db.execute(overdue_query)
        overdue_bills = result.scalars().all()
        
        for bill in overdue_bills:
            logger.info(f"Bill {bill.id} is OVERDUE.")
            bill.status = BillStatus.OVERDUE
            await db.commit()
            
            # Publish event
            await redis_publisher.publish(
                "bill.overdue",
                {
                    "bill_id": str(bill.id),
                    "user_id": bill.user_id,
                    "name": bill.name,
                    "amount": bill.amount
                }
            )

        # 2. Check for bills due TODAY for Auto-pay (simplification)
        # In a real system, you'd check a specific window or use exact dates.
        due_today_query = select(Bill).filter(
            Bill.status == BillStatus.UNPAID,
            Bill.auto_pay == True,
            Bill.next_due_date <= now
        )
        result = await db.execute(due_today_query)
        autopay_bills = result.scalars().all()
        
        for bill in autopay_bills:
            logger.info(f"Triggering auto-pay for Bill {bill.id}.")
            
            # Trigger auto-pay logic (e.g., publish to transaction service)
            await redis_publisher.publish(
                "bill.autopay_triggered",
                {
                    "bill_id": str(bill.id),
                    "user_id": bill.user_id,
                    "name": bill.name,
                    "amount": bill.amount,
                    "category_id": None, # Could map to a category
                    "type": "EXPENSE"
                }
            )
            
            # Note: We don't mark it PAID here, we'd wait for a success event from the transaction service.
            # But for MVP, we could mark it processing or leave as UNPAID/OVERDUE until confirmation.


async def run_scheduler():
    """Main loop for the scheduler."""
    logger.info("Billing scheduler started.")
    while True:
        try:
            await check_due_bills()
        except Exception as e:
            logger.error(f"Error in scheduler: {e}")
            
        # Run every 60 seconds (for MVP/testing). In production, run daily or hourly.
        await asyncio.sleep(60)
