from typing import Dict, Any
from datetime import datetime, timedelta
from services.zoho_client import ZohoBooksClient
from models.zoho_models import FinancialMetrics, AccountBalance
import logging

logger = logging.getLogger(__name__)


class FinancialService:
    """Service for aggregating financial data from Zoho Books"""
    
    def __init__(self, zoho_client: ZohoBooksClient, organization_id: str):
        self.client = zoho_client
        self.organization_id = organization_id
    
    async def fetch_all_financial_data(self) -> FinancialMetrics:
        """Fetch and aggregate all financial data for a startup"""
        
        try:
            # Fetch accounts and calculate balances
            logger.info("Fetching chart of accounts...")
            accounts_data = await self.client.get_chart_of_accounts()
            account_balances = self._extract_account_balances(accounts_data)
            
            # Identify key accounts
            cash_balance = self._get_account_balance_by_type(
                account_balances, ["cash", "bank"]
            )
            accounts_receivable = self._get_account_balance_by_type(
                account_balances, ["accounts_receivable"]
            )
            accounts_payable = self._get_account_balance_by_type(
                account_balances, ["accounts_payable"]
            )
            
            # Fetch invoices and calculate revenue
            logger.info("Fetching invoices...")
            invoices_data = await self.client.get_invoices(status="paid")
            revenue_metrics = self._calculate_revenue_metrics(invoices_data)
            
            # Fetch expenses and calculate burn rate
            logger.info("Fetching expenses...")
            expenses_data = await self.client.get_expenses()
            expense_metrics = self._calculate_expense_metrics(expenses_data)
            
            # Calculate derived metrics
            monthly_net_burn = (
                expense_metrics["total_expenses_month"] - 
                revenue_metrics["total_revenue_month"]
            )
            
            # Calculate runway (months of cash remaining)
            runway_months = None
            if monthly_net_burn > 0 and cash_balance > 0:
                runway_months = cash_balance / monthly_net_burn
            
            financial_metrics = FinancialMetrics(
                organization_id=self.organization_id,
                zoho_organization_id=self.client.organization_id,
                cash_balance=cash_balance,
                accounts_receivable=accounts_receivable,
                accounts_payable=accounts_payable,
                total_revenue_month=revenue_metrics["total_revenue_month"],
                total_revenue_quarter=revenue_metrics["total_revenue_quarter"],
                total_revenue_year=revenue_metrics["total_revenue_year"],
                total_expenses_month=expense_metrics["total_expenses_month"],
                total_expenses_quarter=expense_metrics["total_expenses_quarter"],
                total_expenses_year=expense_metrics["total_expenses_year"],
                burn_rate_monthly=expense_metrics["total_expenses_month"],
                net_burn_rate_monthly=monthly_net_burn,
                runway_months=runway_months,
                account_balances=account_balances,
                fetched_at=datetime.utcnow()
            )
            
            logger.info("Financial data aggregation complete")
            return financial_metrics
        
        except Exception as e:
            logger.error(f"Error fetching financial data: {str(e)}")
            raise
    
    def _extract_account_balances(self, accounts_data: Dict) -> list[AccountBalance]:
        """Extract account balances from Zoho response"""
        account_balances = []
        
        for account in accounts_data.get("chartofaccounts", []):
            balance = account.get("balance", account.get("current_balance", 0))
            
            account_balances.append(AccountBalance(
                account_id=account.get("account_id", ""),
                account_name=account.get("account_name", ""),
                account_type=account.get("account_type", ""),
                balance=float(balance),
                currency_code=account.get("currency_code", "USD")
            ))
        
        return account_balances
    
    def _get_account_balance_by_type(
        self, 
        account_balances: list[AccountBalance], 
        account_types: list[str]
    ) -> float:
        """Get total balance for specific account types"""
        total = 0.0
        for account in account_balances:
            account_type_lower = account.account_type.lower().replace(" ", "_")
            if any(at.lower() in account_type_lower for at in account_types):
                total += account.balance
        return total
    
    def _calculate_revenue_metrics(self, invoices_data: Dict) -> Dict[str, float]:
        """Calculate revenue metrics from invoices"""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate quarter start (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
        current_quarter = (now.month - 1) // 3
        quarter_start_month = current_quarter * 3 + 1
        quarter_start = month_start.replace(month=quarter_start_month)
        
        year_start = month_start.replace(month=1, day=1)
        
        monthly_revenue = 0.0
        quarterly_revenue = 0.0
        yearly_revenue = 0.0
        
        for invoice in invoices_data.get("invoices", []):
            amount = float(invoice.get("total", 0))
            invoice_date_str = invoice.get("date", "")
            
            if invoice_date_str:
                try:
                    # Handle various date formats
                    if "T" in invoice_date_str:
                        invoice_date = datetime.fromisoformat(
                            invoice_date_str.split("T")[0]
                        )
                    else:
                        invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d")
                    
                    if invoice_date >= month_start:
                        monthly_revenue += amount
                        quarterly_revenue += amount
                        yearly_revenue += amount
                    elif invoice_date >= quarter_start:
                        quarterly_revenue += amount
                        yearly_revenue += amount
                    elif invoice_date >= year_start:
                        yearly_revenue += amount
                except (ValueError, TypeError) as e:
                    logger.warning(f"Could not parse invoice date: {invoice_date_str}")
                    continue
        
        return {
            "total_revenue_month": monthly_revenue,
            "total_revenue_quarter": quarterly_revenue,
            "total_revenue_year": yearly_revenue
        }
    
    def _calculate_expense_metrics(self, expenses_data: Dict) -> Dict[str, float]:
        """Calculate expense metrics"""
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        current_quarter = (now.month - 1) // 3
        quarter_start_month = current_quarter * 3 + 1
        quarter_start = month_start.replace(month=quarter_start_month)
        
        year_start = month_start.replace(month=1, day=1)
        
        monthly_expenses = 0.0
        quarterly_expenses = 0.0
        yearly_expenses = 0.0
        
        for expense in expenses_data.get("expenses", []):
            amount = float(expense.get("amount", 0))
            expense_date_str = expense.get("date", "")
            
            if expense_date_str:
                try:
                    if "T" in expense_date_str:
                        expense_date = datetime.fromisoformat(
                            expense_date_str.split("T")[0]
                        )
                    else:
                        expense_date = datetime.strptime(expense_date_str, "%Y-%m-%d")
                    
                    if expense_date >= month_start:
                        monthly_expenses += amount
                        quarterly_expenses += amount
                        yearly_expenses += amount
                    elif expense_date >= quarter_start:
                        quarterly_expenses += amount
                        yearly_expenses += amount
                    elif expense_date >= year_start:
                        yearly_expenses += amount
                except (ValueError, TypeError) as e:
                    logger.warning(f"Could not parse expense date: {expense_date_str}")
                    continue
        
        return {
            "total_expenses_month": monthly_expenses,
            "total_expenses_quarter": quarterly_expenses,
            "total_expenses_year": yearly_expenses
        }
