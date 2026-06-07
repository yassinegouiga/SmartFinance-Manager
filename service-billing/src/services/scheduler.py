

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
    logger.info("Scheduler: Checking for due bills...")
    async with AsyncSessionLocal() as db:
        now = datetime.now()
        
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
            
            await redis_publisher.publish(
                "bill.overdue",
                {
                    "bill_id": str(bill.id),
                    "user_id": bill.user_id,
                    "name": bill.name,
                    "amount": bill.amount
                }
            )

        due_today_query = select(Bill).filter(
            Bill.status == BillStatus.UNPAID,
            Bill.auto_pay == True,
            Bill.next_due_date <= now
        )
        result = await db.execute(due_today_query)
        autopay_bills = result.scalars().all()
        
        for bill in autopay_bills:
            logger.info(f"Triggering auto-pay for Bill {bill.id}.")
            
            await redis_publisher.publish(
                "bill.autopay_triggered",
                {
                    "bill_id": str(bill.id),
                    "user_id": bill.user_id,
                    "name": bill.name,
                    "amount": bill.amount,
                    "category_id": None,
                    "type": "EXPENSE"
                }
            )
            



async def run_scheduler():
    logger.info("Billing scheduler started.")
    while True:
        try:
            await check_due_bills()
        except Exception as e:
            logger.error(f"Error in scheduler: {e}")
            
        await asyncio.sleep(60)
