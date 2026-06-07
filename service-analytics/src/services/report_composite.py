

from abc import ABC, abstractmethod


class ReportComponent(ABC):
    @abstractmethod
    def calculate(self, summary) -> dict:
        pass


class IncomeReport(ReportComponent):
    def calculate(self, summary) -> dict:
        return {"total_income": summary.total_income}


class ExpenseReport(ReportComponent):
    def calculate(self, summary) -> dict:
        return {"total_expense": summary.total_expense}


class BalanceReport(ReportComponent):
    def calculate(self, summary) -> dict:
        savings_rate = (
            round((summary.total_balance / summary.total_income) * 100, 1)
            if summary.total_income > 0 else 0.0
        )
        return {"total_balance": summary.total_balance, "savings_rate": savings_rate}


class FinancialReport(ReportComponent):
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
