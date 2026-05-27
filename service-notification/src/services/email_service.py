import logging
from src.core.config import settings
from src.services.email_adapter import EmailProvider, ResendAdapter

logger = logging.getLogger("email-service")

# Adapter Pattern — the rest of the app only depends on EmailProvider.
# To switch providers, replace ResendAdapter with e.g. SendGridAdapter here.
def _get_provider() -> EmailProvider:
    return ResendAdapter(settings.RESEND_API_KEY, settings.RESEND_FROM)


def send_email(to: str, subject: str, html: str) -> None:
    """Send an email via the configured provider. Fire-and-forget — errors are logged."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email.")
        return
    _get_provider().send(to, subject, html)


# ── HTML templates ────────────────────────────────────────

def _wrap(body: str) -> str:
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;background:#080b12;color:#f0f4ff;padding:40px 20px;min-height:100vh">
      <div style="max-width:520px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <div style="background:linear-gradient(135deg,#6C63FF,#3ECFCF);border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px">💰</div>
          <span style="font-size:17px;font-weight:700;background:linear-gradient(135deg,#6C63FF,#3ECFCF);-webkit-background-clip:text;-webkit-text-fill-color:transparent">SmartFinance</span>
        </div>
        {body}
        <p style="margin-top:28px;font-size:11px;color:#4a5568;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px">
          You're receiving this because you have an active SmartFinance account.
        </p>
      </div>
    </div>"""


def bill_due_soon_html(first_name: str, bill_name: str, amount: float, due_date: str) -> str:
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Hey {first_name}, a bill is due soon 📅</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Don't miss your upcoming payment.</p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:20px">
        <p style="margin:0;font-size:15px;font-weight:600">{bill_name}</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#f59e0b">${amount:,.2f}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#8892a4">Due: {due_date}</p>
      </div>""")


def bill_overdue_html(first_name: str, bill_name: str, amount: float) -> str:
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Bill overdue ⚠️</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Please pay as soon as possible to avoid issues.</p>
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px">
        <p style="margin:0;font-size:15px;font-weight:600">{bill_name}</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#ef4444">${amount:,.2f}</p>
      </div>""")


def budget_warning_html(first_name: str, pct: int, limit: float, spent: float) -> str:
    color = "#ef4444" if pct >= 100 else "#f59e0b"
    label = "exceeded" if pct >= 100 else f"{pct}% used"
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Budget alert 📊</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Hey {first_name}, your budget for this month needs attention.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:14px;color:#8892a4">Spent</span>
          <span style="font-weight:700;color:{color}">${spent:,.2f} / ${limit:,.2f}</span>
        </div>
        <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:8px;overflow:hidden">
          <div style="background:{color};height:100%;width:{min(pct,100)}%;border-radius:4px"></div>
        </div>
        <p style="margin:10px 0 0;font-size:13px;color:{color};font-weight:600">{label}</p>
      </div>""")


def large_transaction_html(first_name: str, amount: float, description: str) -> str:
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Large transaction detected 🔔</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Hey {first_name}, a large expense was just recorded.</p>
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:20px">
        <p style="margin:0;font-size:15px;font-weight:600">{description or "Expense"}</p>
        <p style="margin:6px 0 0;font-size:26px;font-weight:800;color:#ef4444">-${amount:,.2f}</p>
      </div>""")


def saving_milestone_html(first_name: str, pot_name: str, pct: int, current: float, target: float) -> str:
    emoji = "🎉" if pct >= 100 else "🏆"
    label = "Goal reached!" if pct >= 100 else f"{pct}% reached"
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Savings milestone {emoji}</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Hey {first_name}, great progress on your saving pot!</p>
      <div style="background:rgba(62,207,207,0.1);border:1px solid rgba(62,207,207,0.25);border-radius:12px;padding:20px">
        <p style="margin:0;font-size:15px;font-weight:600">{pot_name}</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:#3ecfcf">${current:,.2f} / ${target:,.2f}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#3ecfcf;font-weight:600">{label}</p>
      </div>""")


def weekly_digest_html(first_name: str, income: float, expense: float, txn_count: int) -> str:
    net = income - expense
    net_color = "#22c55e" if net >= 0 else "#ef4444"
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">Your weekly digest 📈</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Hey {first_name}, here's your financial summary for the past 7 days.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0;font-size:11px;color:#8892a4;text-transform:uppercase;letter-spacing:0.5px">Income</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#22c55e">+${income:,.0f}</p>
        </div>
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0;font-size:11px;color:#8892a4;text-transform:uppercase;letter-spacing:0.5px">Expenses</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#ef4444">-${expense:,.0f}</p>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0;font-size:11px;color:#8892a4;text-transform:uppercase;letter-spacing:0.5px">Net</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:{net_color}">${net:+,.0f}</p>
        </div>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#8892a4;text-align:center">{txn_count} transactions recorded</p>""")


def monthly_summary_html(first_name: str, month_name: str, income: float, expense: float, txn_count: int) -> str:
    net = income - expense
    net_color = "#22c55e" if net >= 0 else "#ef4444"
    return _wrap(f"""
      <h2 style="margin:0 0 8px;font-size:20px">{month_name} summary 📅</h2>
      <p style="color:#8892a4;margin:0 0 24px;font-size:14px">Hey {first_name}, here's how your finances looked last month.</p>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="color:#8892a4">Total Income</span><span style="color:#22c55e;font-weight:700">+${income:,.2f}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="color:#8892a4">Total Expenses</span><span style="color:#ef4444;font-weight:700">-${expense:,.2f}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="color:#8892a4">Net</span><span style="color:{net_color};font-weight:800;font-size:16px">${net:+,.2f}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0">
          <span style="color:#8892a4">Transactions</span><span style="font-weight:600">{txn_count}</span>
        </div>
      </div>""")
