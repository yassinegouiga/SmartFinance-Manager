"""
Composite Pattern — lets the dashboard treat individual financial metrics
and full reports uniformly through the ReportComponent interface.

Tree structure:
    FinancialReport (composite)
    ├── IncomeReport  (leaf)
    ├── ExpenseReport (leaf)
    └── BalanceReport (leaf)

New report types (e.g. SavingsReport) can be added by subclassing
ReportComponent and calling financial_report.add() — no other code changes needed.
"""

from abc import ABC, abstractmethod


class ReportComponent(ABC):
    @abstractmethod
    def calculate(self, summary) -> dict:
        pass


class IncomeReport(ReportComponent):
    """Leaf — total income for the month."""
    def calculate(self, summary) -> dict:
        return {"total_income": summary.total_income}


class ExpenseReport(ReportComponent):
    """Leaf — total expenses for the month."""
    def calculate(self, summary) -> dict:
        return {"total_expense": summary.total_expense}


class BalanceReport(ReportComponent):
    """Leaf — net balance and derived savings rate."""
    def calculate(self, summary) -> dict:
        savings_rate = (
            round((summary.total_balance / summary.total_income) * 100, 1)
            if summary.total_income > 0 else 0.0
        )
        return {"total_balance": summary.total_balance, "savings_rate": savings_rate}


class FinancialReport(ReportComponent):
    """Composite — aggregates child components into one unified report dict."""

    def __init__(self):
        self._components: list[ReportComponent] = []

    def add(self, component: ReportComponent) -> None:
        self._components.append(component)

    def remove(self, component: ReportComponent) -> None:
        self._components.remove(component)

    def calculate(self, summary) -> dict:
        result: dict = {}
        for component in self._components:
            result.update(component.calculate(summary))
        return result
