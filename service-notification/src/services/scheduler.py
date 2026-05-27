"""
Notification scheduler — runs every 30 minutes and checks all notification conditions.
Uses reference_key deduplication so the same event never triggers twice.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import text

from src.core.database import AsyncSessionLocal
from src.crud.crud_notification import create_notification
from src.services.email_service import (
    send_email,
    bill_overdue_html,
    saving_milestone_html,
    weekly_digest_html,
    monthly_summary_html,
)
from src.services.notification_bridge import (
    EmailChannel,
    BudgetAlertNotification,
    BillReminderNotification,
    LargeTransactionNotification,
)

logger = logging.getLogger("notification-scheduler")

LARGE_TXN_THRESHOLD = 500.0


# ── Individual check functions ────────────────────────────

async def check_bill_reminders(db) -> None:
    rows = await db.execute(text("""
        SELECT b.id::text, b.user_id, b.name, b.amount, b.next_due_date,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM billing_service.bills b
        JOIN user_service.users u ON u.firebase_uid = b.user_id
        WHERE b.status = 'UNPAID'
          AND b.next_due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    """))
    for row in rows.mappings():
        ref = f"bill_due_{row['id']}_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title=f"Bill due soon: {row['name']}",
            message=f"${row['amount']:,.2f} is due on {row['next_due_date'].strftime('%b %d')}.",
            type="bill_due_soon",
            reference_key=ref,
        )
        if notif:
            BillReminderNotification(EmailChannel()).send(
                row["email"],
                first_name=row["first_name"],
                bill_name=row["name"],
                amount=row["amount"],
                due_date=row["next_due_date"].strftime("%B %d, %Y"),
            )


async def check_overdue_bills(db) -> None:
    rows = await db.execute(text("""
        SELECT b.id::text, b.user_id, b.name, b.amount,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM billing_service.bills b
        JOIN user_service.users u ON u.firebase_uid = b.user_id
        WHERE b.status = 'OVERDUE'
    """))
    for row in rows.mappings():
        ref = f"bill_overdue_{row['id']}_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title=f"Bill overdue: {row['name']}",
            message=f"${row['amount']:,.2f} is overdue. Pay as soon as possible.",
            type="bill_overdue",
            reference_key=ref,
        )
        if notif:
            send_email(
                row["email"],
                f"Overdue: {row['name']}",
                bill_overdue_html(row["first_name"], row["name"], row["amount"]),
            )


async def check_budget_alerts(db) -> None:
    now = datetime.now(timezone.utc)
    rows = await db.execute(text("""
        SELECT b.id::text, b.user_id, b.monthly_limit, b.spent_amount,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM budget_service.budgets b
        JOIN user_service.users u ON u.firebase_uid = b.user_id
        WHERE b.month = :month AND b.year = :year
          AND b.monthly_limit > 0
          AND (b.spent_amount / b.monthly_limit) >= 0.8
    """), {"month": now.month, "year": now.year})
    for row in rows.mappings():
        pct = int(row["spent_amount"] / row["monthly_limit"] * 100)
        level = "100" if pct >= 100 else "80"
        ref = f"budget_{level}_{row['id']}_{now.year}_{now.month}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title="Budget exceeded!" if pct >= 100 else f"Budget at {pct}%",
            message=f"${row['spent_amount']:,.2f} spent of ${row['monthly_limit']:,.2f} limit.",
            type="budget_exceeded" if pct >= 100 else "budget_warning",
            reference_key=ref,
        )
        if notif:
            BudgetAlertNotification(EmailChannel()).send(
                row["email"],
                first_name=row["first_name"],
                pct=pct,
                limit=row["monthly_limit"],
                spent=row["spent_amount"],
            )


async def check_large_transactions(db) -> None:
    rows = await db.execute(text("""
        SELECT t.id::text, t.user_id, t.amount, t.description,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM transaction_service.transactions t
        JOIN user_service.users u ON u.firebase_uid = t.user_id
        WHERE t.type = 'EXPENSE'
          AND t.amount > :threshold
          AND t.date >= NOW() - INTERVAL '35 minutes'
    """), {"threshold": LARGE_TXN_THRESHOLD})
    for row in rows.mappings():
        ref = f"large_txn_{row['id']}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title=f"Large expense: ${row['amount']:,.2f}",
            message=f"{row['description'] or 'An expense'} of ${row['amount']:,.2f} was recorded.",
            type="large_transaction",
            reference_key=ref,
        )
        if notif:
            LargeTransactionNotification(EmailChannel()).send(
                row["email"],
                first_name=row["first_name"],
                amount=row["amount"],
                description=row["description"] or "",
            )


async def check_saving_milestones(db) -> None:
    rows = await db.execute(text("""
        SELECT sp.id::text, sp.user_id, sp.name, sp.target_amount, sp.current_amount,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM budget_service.saving_pots sp
        JOIN user_service.users u ON u.firebase_uid = sp.user_id
        WHERE sp.target_amount > 0 AND sp.current_amount > 0
    """))
    for row in rows.mappings():
        pct = int(row["current_amount"] / row["target_amount"] * 100)
        if pct >= 100:
            ref = f"saving_100_{row['id']}"
            label, title = "Goal reached!", "Saving goal reached! 🎉"
        elif pct >= 50:
            ref = f"saving_50_{row['id']}"
            label, title = "50% reached", f"Halfway to your goal: {row['name']}"
        else:
            continue
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title=title,
            message=f"{row['name']}: ${row['current_amount']:,.2f} of ${row['target_amount']:,.2f} ({pct}%).",
            type="saving_milestone",
            reference_key=ref,
        )
        if notif:
            send_email(
                row["email"],
                title,
                saving_milestone_html(
                    row["first_name"], row["name"], pct,
                    row["current_amount"], row["target_amount"],
                ),
            )


async def send_weekly_digests(db) -> None:
    now = datetime.now(timezone.utc)
    year, week, _ = now.isocalendar()
    rows = await db.execute(text("""
        SELECT t.user_id,
               SUM(CASE WHEN t.type = 'INCOME'  THEN t.amount ELSE 0 END) AS income,
               SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expense,
               COUNT(*) AS txn_count,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM transaction_service.transactions t
        JOIN user_service.users u ON u.firebase_uid = t.user_id
        WHERE t.date >= NOW() - INTERVAL '7 days'
        GROUP BY t.user_id, u.email, u.first_name
    """))
    for row in rows.mappings():
        ref = f"weekly_{row['user_id']}_{year}_W{week}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title="Your weekly financial digest",
            message=f"Income: ${row['income']:,.0f} | Expenses: ${row['expense']:,.0f} | {row['txn_count']} transactions.",
            type="weekly_digest",
            reference_key=ref,
        )
        if notif:
            send_email(
                row["email"],
                "Your SmartFinance weekly digest",
                weekly_digest_html(
                    row["first_name"], float(row["income"]),
                    float(row["expense"]), int(row["txn_count"]),
                ),
            )


async def send_monthly_summaries(db) -> None:
    now = datetime.now(timezone.utc)
    prev_month = now.month - 1 if now.month > 1 else 12
    prev_year  = now.year if now.month > 1 else now.year - 1
    month_name = datetime(prev_year, prev_month, 1).strftime("%B %Y")

    rows = await db.execute(text("""
        SELECT t.user_id,
               SUM(CASE WHEN t.type = 'INCOME'  THEN t.amount ELSE 0 END) AS income,
               SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount ELSE 0 END) AS expense,
               COUNT(*) AS txn_count,
               u.email, COALESCE(u.first_name, 'there') AS first_name
        FROM transaction_service.transactions t
        JOIN user_service.users u ON u.firebase_uid = t.user_id
        WHERE EXTRACT(MONTH FROM t.date) = :month AND EXTRACT(YEAR FROM t.date) = :year
        GROUP BY t.user_id, u.email, u.first_name
    """), {"month": prev_month, "year": prev_year})
    for row in rows.mappings():
        ref = f"monthly_{row['user_id']}_{prev_year}_{prev_month}"
        notif = await create_notification(
            db,
            user_id=row["user_id"],
            title=f"{month_name} summary",
            message=f"Income: ${row['income']:,.0f} | Expenses: ${row['expense']:,.0f}.",
            type="monthly_summary",
            reference_key=ref,
        )
        if notif:
            send_email(
                row["email"],
                f"Your {month_name} financial summary",
                monthly_summary_html(
                    row["first_name"], month_name,
                    float(row["income"]), float(row["expense"]), int(row["txn_count"]),
                ),
            )


# ── Main scheduler loop ───────────────────────────────────

async def run_scheduler() -> None:
    logger.info("Notification scheduler started.")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                logger.info(f"Scheduler tick at {now.isoformat()}")

                await check_bill_reminders(db)
                await check_overdue_bills(db)
                await check_budget_alerts(db)
                await check_large_transactions(db)
                await check_saving_milestones(db)

                # Weekly digest — every Monday
                if now.weekday() == 0 and now.hour == 8:
                    await send_weekly_digests(db)

                # Monthly summary — 1st of each month
                if now.day == 1 and now.hour == 8:
                    await send_monthly_summaries(db)

        except Exception as e:
            logger.error(f"Scheduler error: {e}", exc_info=True)

        await asyncio.sleep(1800)  # run every 30 minutes
