import logging
from src.core.config import settings
from src.services.email_adapter import EmailProvider, ResendAdapter

logger = logging.getLogger("email-service")


def _get_provider() -> EmailProvider:
    return ResendAdapter(settings.RESEND_API_KEY, settings.RESEND_FROM)


def send_email(to: str, subject: str, html: str) -> None:

    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email.")
        return
    _get_provider().send(to, subject, html)



FONT = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
BG          = "#0a0c10"
SURFACE     = "#14181f"
SURFACE_2   = "#1a1f29"
TRACK       = "#232936"
BORDER      = "#262d3a"
BORDER_SOFT = "#1e242f"
TEXT        = "#e9edf3"
TEXT_2      = "#a3adbd"
TEXT_3      = "#6b7689"
FAINT       = "#4a5363"
ACCENT      = "#10b981"
ACCENT_2    = "#34d399"
INK         = "#03130d"
POS         = "#34d399"
NEG         = "#fb7185"
WARN        = "#fbbf24"
INFO        = "#60a5fa"




def _wrap(body: str) -> str:
    return f"""
    <div style="font-family:{FONT};background:{BG};color:{TEXT};padding:40px 20px;margin:0">
      <div style="max-width:520px;margin:0 auto;background:{SURFACE};border:1px solid {BORDER};border-radius:16px;padding:32px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px">
          <tr>
            <td style="vertical-align:middle">
              <div style="background:linear-gradient(150deg,{ACCENT_2},{ACCENT});border-radius:11px;width:38px;height:38px;text-align:center;line-height:38px;color:{INK};font-size:19px;font-weight:800">$</div>
            </td>
            <td style="vertical-align:middle;padding-left:11px">
              <div style="font-size:17px;font-weight:800;letter-spacing:-0.02em;color:{TEXT}">Smart<span style="color:{ACCENT_2}">Finance</span></div>
              <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;color:{TEXT_3};text-transform:uppercase">Manager</div>
            </td>
          </tr>
        </table>
        {body}
        <p style="margin:28px 0 0;font-size:11px;color:{FAINT};border-top:1px solid {BORDER_SOFT};padding-top:16px">
          You're receiving this because you have an active SmartFinance account.
        </p>
      </div>
    </div>"""


def _heading(title: str, sub: str) -> str:
    return (
        f'<h2 style="margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:{TEXT}">{title}</h2>'
        f'<p style="color:{TEXT_3};margin:0 0 24px;font-size:14px">{sub}</p>'
    )


def _badge(text: str, color: str, soft: str) -> str:
    return (
        f'<span style="display:inline-block;font-size:12px;font-weight:700;padding:4px 10px;'
        f'border-radius:99px;background:{soft};color:{color}">{text}</span>'
    )


def _amount_card(title: str, amount_html: str, color: str, soft: str, line: str, meta: str = "", badge: str = "") -> str:
    badge_row = f'<div style="margin-bottom:10px">{badge}</div>' if badge else ""
    meta_row = f'<p style="margin:6px 0 0;font-size:13px;color:{TEXT_2}">{meta}</p>' if meta else ""
    return f"""
      <div style="background:{soft};border:1px solid {line};border-radius:12px;padding:20px">
        {badge_row}
        <p style="margin:0;font-size:15px;font-weight:700;color:{TEXT}">{title}</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:{color}">{amount_html}</p>
        {meta_row}
      </div>"""


def _progress(pct: int, color: str) -> str:
    return f"""
      <div style="background:{TRACK};border-radius:99px;height:9px;overflow:hidden;margin-top:14px">
        <div style="background:{color};height:9px;width:{min(max(pct,0),100)}%;border-radius:99px"></div>
      </div>"""


def bill_due_soon_html(first_name: str, bill_name: str, amount: float, due_date: str) -> str:
    soft = "rgba(251,191,36,0.12)"; line = "rgba(251,191,36,0.3)"
    return _wrap(
        _heading(f"Hey {first_name}, a bill is due soon", "Don't miss your upcoming payment.")
        + _amount_card(bill_name, f"${amount:,.2f}", WARN, soft, line, meta=f"Due {due_date}",
                       badge=_badge("Due soon", WARN, "rgba(251,191,36,0.16)"))
    )


def bill_overdue_html(first_name: str, bill_name: str, amount: float) -> str:
    soft = "rgba(251,113,133,0.12)"; line = "rgba(251,113,133,0.3)"
    return _wrap(
        _heading("Bill overdue", "Please pay as soon as possible to avoid issues.")
        + _amount_card(bill_name, f"${amount:,.2f}", NEG, soft, line,
                       badge=_badge("Overdue", NEG, "rgba(251,113,133,0.16)"))
    )


def budget_warning_html(first_name: str, pct: int, limit: float, spent: float) -> str:
    over = pct >= 100
    color = NEG if over else WARN
    label = "Budget exceeded" if over else f"{pct}% of budget used"
    return _wrap(
        _heading("Budget alert", f"Hey {first_name}, your budget for this month needs attention.")
        + f"""
      <div style="background:{SURFACE_2};border:1px solid {BORDER};border-radius:12px;padding:20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size:14px;color:{TEXT_2}">Spent</td>
            <td style="text-align:right;font-size:14px;font-weight:800;color:{color}">${spent:,.2f} <span style="color:{TEXT_3};font-weight:600">/ ${limit:,.2f}</span></td>
          </tr>
        </table>
        {_progress(pct, color)}
        <p style="margin:12px 0 0;font-size:13px;color:{color};font-weight:700">{label}</p>
      </div>"""
    )


def large_transaction_html(first_name: str, amount: float, description: str) -> str:
    soft = "rgba(251,113,133,0.12)"; line = "rgba(251,113,133,0.3)"
    return _wrap(
        _heading("Large transaction detected", f"Hey {first_name}, a large expense was just recorded.")
        + _amount_card(description or "Expense", f"&minus;${amount:,.2f}", NEG, soft, line,
                       badge=_badge("Heads up", NEG, "rgba(251,113,133,0.16)"))
    )


def saving_milestone_html(first_name: str, pot_name: str, pct: int, current: float, target: float) -> str:
    reached = pct >= 100
    soft = "rgba(52,211,153,0.12)"; line = "rgba(52,211,153,0.3)"
    label = "Goal reached!" if reached else f"{pct}% of the way there"
    return _wrap(
        _heading("Savings milestone", f"Hey {first_name}, great progress on your saving pot!")
        + f"""
      <div style="background:{soft};border:1px solid {line};border-radius:12px;padding:20px">
        <div style="margin-bottom:10px">{_badge("Reached" if reached else "On track", POS, "rgba(52,211,153,0.16)")}</div>
        <p style="margin:0;font-size:15px;font-weight:700;color:{TEXT}">{pot_name}</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:{POS}">${current:,.2f} <span style="font-size:15px;color:{TEXT_3};font-weight:600">/ ${target:,.2f}</span></p>
        {_progress(pct, f"linear-gradient(90deg,{ACCENT_2},{ACCENT})")}
        <p style="margin:12px 0 0;font-size:13px;color:{POS};font-weight:700">{label}</p>
      </div>"""
    )


def _stat_cell(label: str, value: str, color: str, soft: str) -> str:
    return f"""
      <td width="33%" style="padding:0 4px">
        <div style="background:{soft};border-radius:12px;padding:16px;text-align:center">
          <p style="margin:0;font-size:11px;color:{TEXT_3};text-transform:uppercase;letter-spacing:0.5px">{label}</p>
          <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:{color}">{value}</p>
        </div>
      </td>"""


def weekly_digest_html(first_name: str, income: float, expense: float, txn_count: int) -> str:
    net = income - expense
    net_color = POS if net >= 0 else NEG
    return _wrap(
        _heading("Your weekly digest", f"Hey {first_name}, here's your financial summary for the past 7 days.")
        + f"""
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -4px">
        <tr>
          {_stat_cell("Income", f"+${income:,.0f}", POS, "rgba(52,211,153,0.12)")}
          {_stat_cell("Expenses", f"&minus;${expense:,.0f}", NEG, "rgba(251,113,133,0.12)")}
          {_stat_cell("Net", f"${net:+,.0f}", net_color, SURFACE_2)}
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:{TEXT_3};text-align:center">{txn_count} transactions recorded</p>"""
    )


def _row(label: str, value: str, color: str, last: bool = False, big: bool = False) -> str:
    border = "" if last else f"border-bottom:1px solid {BORDER_SOFT}"
    size = "16px" if big else "14px"
    weight = "800" if big else "700"
    return f"""
        <tr>
          <td style="padding:10px 0;{border};color:{TEXT_2};font-size:14px">{label}</td>
          <td style="padding:10px 0;{border};text-align:right;color:{color};font-weight:{weight};font-size:{size}">{value}</td>
        </tr>"""


def monthly_summary_html(first_name: str, month_name: str, income: float, expense: float, txn_count: int) -> str:
    net = income - expense
    net_color = POS if net >= 0 else NEG
    return _wrap(
        _heading(f"{month_name} summary", f"Hey {first_name}, here's how your finances looked last month.")
        + f"""
      <div style="background:{SURFACE_2};border:1px solid {BORDER};border-radius:12px;padding:8px 20px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          {_row("Total income", f"+${income:,.2f}", POS)}
          {_row("Total expenses", f"&minus;${expense:,.2f}", NEG)}
          {_row("Net", f"${net:+,.2f}", net_color, big=True)}
          {_row("Transactions", str(txn_count), TEXT, last=True)}
        </table>
      </div>"""
    )
