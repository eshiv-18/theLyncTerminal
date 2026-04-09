import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime
from services.financial_service import FinancialService
from services.zoho_client import ZohoBooksClient


@pytest.mark.asyncio
async def test_fetch_all_financial_data():
    """Test comprehensive financial data aggregation"""
    
    # Mock chart of accounts response
    mock_accounts = {
        "code": 0,
        "chartofaccounts": [
            {
                "account_id": "1",
                "account_name": "Operating Account",
                "account_type": "cash",
                "balance": 50000.00,
                "currency_code": "USD"
            },
            {
                "account_id": "2",
                "account_name": "Accounts Receivable",
                "account_type": "accounts_receivable",
                "balance": 15000.00,
                "currency_code": "USD"
            },
            {
                "account_id": "3",
                "account_name": "Accounts Payable",
                "account_type": "accounts_payable",
                "balance": 8000.00,
                "currency_code": "USD"
            }
        ]
    }
    
    # Mock invoices response
    mock_invoices = {
        "code": 0,
        "invoices": [
            {
                "invoice_id": "inv1",
                "total": 5000.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "status": "paid"
            },
            {
                "invoice_id": "inv2",
                "total": 3000.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "status": "paid"
            }
        ]
    }
    
    # Mock expenses response
    mock_expenses = {
        "code": 0,
        "expenses": [
            {
                "expense_id": "exp1",
                "amount": 2000.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            },
            {
                "expense_id": "exp2",
                "amount": 1500.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            }
        ]
    }
    
    # Create mock Zoho client
    mock_client = AsyncMock(spec=ZohoBooksClient)
    mock_client.organization_id = "test_org_123"
    mock_client.get_chart_of_accounts.return_value = mock_accounts
    mock_client.get_invoices.return_value = mock_invoices
    mock_client.get_expenses.return_value = mock_expenses
    
    # Create financial service
    service = FinancialService(
        zoho_client=mock_client,
        organization_id="startup_org_1"
    )
    
    # Fetch financial data
    metrics = await service.fetch_all_financial_data()
    
    # Assertions
    assert metrics.organization_id == "startup_org_1"
    assert metrics.zoho_organization_id == "test_org_123"
    assert metrics.cash_balance == 50000.00
    assert metrics.accounts_receivable == 15000.00
    assert metrics.accounts_payable == 8000.00
    assert metrics.total_revenue_month == 8000.00  # 5000 + 3000
    assert metrics.total_expenses_month == 3500.00  # 2000 + 1500
    assert metrics.burn_rate_monthly == 3500.00
    
    # Net burn should be negative (cash positive)
    assert metrics.net_burn_rate_monthly < 0
    
    # Runway should be calculated
    assert metrics.runway_months is None  # No burn (revenue > expenses)
    
    # Verify all client methods were called
    mock_client.get_chart_of_accounts.assert_called_once()
    mock_client.get_invoices.assert_called_once()
    mock_client.get_expenses.assert_called_once()


@pytest.mark.asyncio
async def test_runway_calculation():
    """Test runway calculation with net burn"""
    
    mock_accounts = {
        "code": 0,
        "chartofaccounts": [
            {
                "account_id": "1",
                "account_name": "Cash",
                "account_type": "cash",
                "balance": 100000.00,
                "currency_code": "USD"
            }
        ]
    }
    
    # Revenue less than expenses = net burn
    mock_invoices = {
        "code": 0,
        "invoices": [
            {
                "invoice_id": "inv1",
                "total": 5000.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "status": "paid"
            }
        ]
    }
    
    mock_expenses = {
        "code": 0,
        "expenses": [
            {
                "expense_id": "exp1",
                "amount": 15000.00,
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            }
        ]
    }
    
    mock_client = AsyncMock(spec=ZohoBooksClient)
    mock_client.organization_id = "test_org_123"
    mock_client.get_chart_of_accounts.return_value = mock_accounts
    mock_client.get_invoices.return_value = mock_invoices
    mock_client.get_expenses.return_value = mock_expenses
    
    service = FinancialService(
        zoho_client=mock_client,
        organization_id="startup_org_1"
    )
    
    metrics = await service.fetch_all_financial_data()
    
    # Net burn = 15000 - 5000 = 10000
    assert metrics.net_burn_rate_monthly == 10000.00
    
    # Runway = 100000 / 10000 = 10 months
    assert metrics.runway_months == 10.0


@pytest.mark.asyncio
async def test_empty_invoices_and_expenses():
    """Test handling of empty invoices and expenses"""
    
    mock_accounts = {
        "code": 0,
        "chartofaccounts": []
    }
    
    mock_invoices = {
        "code": 0,
        "invoices": []
    }
    
    mock_expenses = {
        "code": 0,
        "expenses": []
    }
    
    mock_client = AsyncMock(spec=ZohoBooksClient)
    mock_client.organization_id = "test_org_123"
    mock_client.get_chart_of_accounts.return_value = mock_accounts
    mock_client.get_invoices.return_value = mock_invoices
    mock_client.get_expenses.return_value = mock_expenses
    
    service = FinancialService(
        zoho_client=mock_client,
        organization_id="startup_org_1"
    )
    
    metrics = await service.fetch_all_financial_data()
    
    # All metrics should be 0
    assert metrics.cash_balance == 0.0
    assert metrics.total_revenue_month == 0.0
    assert metrics.total_expenses_month == 0.0
    assert metrics.burn_rate_monthly == 0.0
    assert metrics.net_burn_rate_monthly == 0.0
    assert metrics.runway_months is None


@pytest.mark.asyncio
async def test_quarterly_and_yearly_calculations():
    """Test quarterly and yearly revenue/expense calculations"""
    from datetime import timedelta
    
    now = datetime.utcnow()
    
    # Create dates for different quarters
    this_month = now.strftime("%Y-%m-%d")
    last_quarter = (now - timedelta(days=100)).strftime("%Y-%m-%d")
    last_year = (now - timedelta(days=400)).strftime("%Y-%m-%d")
    
    mock_accounts = {
        "code": 0,
        "chartofaccounts": []
    }
    
    mock_invoices = {
        "code": 0,
        "invoices": [
            {"invoice_id": "1", "total": 1000.00, "date": this_month, "status": "paid"},
            {"invoice_id": "2", "total": 2000.00, "date": last_quarter, "status": "paid"},
            {"invoice_id": "3", "total": 3000.00, "date": last_year, "status": "paid"}
        ]
    }
    
    mock_expenses = {
        "code": 0,
        "expenses": [
            {"expense_id": "1", "amount": 500.00, "date": this_month},
            {"expense_id": "2", "amount": 1000.00, "date": last_quarter},
            {"expense_id": "3", "amount": 1500.00, "date": last_year}
        ]
    }
    
    mock_client = AsyncMock(spec=ZohoBooksClient)
    mock_client.organization_id = "test_org_123"
    mock_client.get_chart_of_accounts.return_value = mock_accounts
    mock_client.get_invoices.return_value = mock_invoices
    mock_client.get_expenses.return_value = mock_expenses
    
    service = FinancialService(
        zoho_client=mock_client,
        organization_id="startup_org_1"
    )
    
    metrics = await service.fetch_all_financial_data()
    
    # Monthly should only include this month's data
    assert metrics.total_revenue_month == 1000.00
    assert metrics.total_expenses_month == 500.00
    
    # Quarterly and yearly should include more data
    assert metrics.total_revenue_quarter >= metrics.total_revenue_month
    assert metrics.total_revenue_year >= metrics.total_revenue_quarter


@pytest.mark.asyncio
async def test_account_balance_extraction():
    """Test extraction of account balances"""
    
    mock_accounts = {
        "code": 0,
        "chartofaccounts": [
            {
                "account_id": "1",
                "account_name": "Primary Bank",
                "account_type": "bank",
                "balance": 25000.00,
                "currency_code": "USD"
            },
            {
                "account_id": "2",
                "account_name": "Petty Cash",
                "account_type": "cash",
                "balance": 1000.00,
                "currency_code": "USD"
            },
            {
                "account_id": "3",
                "account_name": "Savings",
                "account_type": "bank",
                "balance": 50000.00,
                "currency_code": "USD"
            }
        ]
    }
    
    mock_invoices = {"code": 0, "invoices": []}
    mock_expenses = {"code": 0, "expenses": []}
    
    mock_client = AsyncMock(spec=ZohoBooksClient)
    mock_client.organization_id = "test_org_123"
    mock_client.get_chart_of_accounts.return_value = mock_accounts
    mock_client.get_invoices.return_value = mock_invoices
    mock_client.get_expenses.return_value = mock_expenses
    
    service = FinancialService(
        zoho_client=mock_client,
        organization_id="startup_org_1"
    )
    
    metrics = await service.fetch_all_financial_data()
    
    # Cash balance should include both bank and cash accounts
    # 25000 + 1000 + 50000 = 76000
    assert metrics.cash_balance == 76000.00
    
    # Account balances list should have 3 items
    assert len(metrics.account_balances) == 3
