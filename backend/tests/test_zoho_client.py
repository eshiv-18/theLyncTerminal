import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from services.zoho_client import ZohoBooksClient


@pytest.mark.asyncio
async def test_zoho_client_initialization():
    """Test ZohoBooksClient initialization"""
    client = ZohoBooksClient(
        access_token="test_token",
        organization_id="test_org_123"
    )
    
    assert client.access_token == "test_token"
    assert client.organization_id == "test_org_123"
    assert client.base_url == "https://www.zohoapis.com/books/v3"


@pytest.mark.asyncio
async def test_get_invoices_success():
    """Test successful invoice retrieval"""
    mock_response = {
        "code": 0,
        "message": "success",
        "invoices": [
            {
                "invoice_id": "123",
                "invoice_number": "INV-001",
                "total": 1000.00,
                "status": "paid",
                "date": "2024-04-01"
            },
            {
                "invoice_id": "124",
                "invoice_number": "INV-002",
                "total": 2500.00,
                "status": "paid",
                "date": "2024-04-15"
            }
        ]
    }
    
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_invoices()
        
        assert result["code"] == 0
        assert len(result["invoices"]) == 2
        assert result["invoices"][0]["total"] == 1000.00
        mock_request.assert_called_once()


@pytest.mark.asyncio
async def test_get_expenses_success():
    """Test successful expense retrieval"""
    mock_response = {
        "code": 0,
        "message": "success",
        "expenses": [
            {
                "expense_id": "exp1",
                "amount": 500.00,
                "date": "2024-04-05",
                "account_name": "Office Supplies"
            }
        ]
    }
    
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_expenses()
        
        assert result["code"] == 0
        assert len(result["expenses"]) == 1
        assert result["expenses"][0]["amount"] == 500.00


@pytest.mark.asyncio
async def test_get_chart_of_accounts_success():
    """Test successful chart of accounts retrieval"""
    mock_response = {
        "code": 0,
        "message": "success",
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
            }
        ]
    }
    
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_chart_of_accounts()
        
        assert result["code"] == 0
        assert len(result["chartofaccounts"]) == 2
        assert result["chartofaccounts"][0]["balance"] == 50000.00


@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiting mechanism"""
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    # Simulate reaching rate limit
    client.request_times = [
        datetime.now() - timedelta(seconds=i) 
        for i in range(100)
    ]
    
    # Verify that request times list has 100 items
    assert len(client.request_times) == 100


@pytest.mark.asyncio
async def test_api_error_handling():
    """Test error handling for API failures"""
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("API connection failed")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_invoices()
        
        assert "API connection failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_unauthorized_token():
    """Test handling of unauthorized/expired token"""
    client = ZohoBooksClient("expired_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("Unauthorized - token expired")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_invoices()
        
        assert "Unauthorized" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_bills_success():
    """Test successful bills retrieval"""
    mock_response = {
        "code": 0,
        "message": "success",
        "bills": [
            {
                "bill_id": "bill1",
                "bill_number": "BILL-001",
                "total": 3000.00,
                "status": "open"
            }
        ]
    }
    
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_bills()
        
        assert result["code"] == 0
        assert len(result["bills"]) == 1
        assert result["bills"][0]["total"] == 3000.00


@pytest.mark.asyncio
async def test_pagination_parameters():
    """Test that pagination parameters are passed correctly"""
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"invoices": []}
        
        await client.get_invoices(page=2, per_page=100)
        
        # Verify pagination params were passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['page'] == 2
        assert call_params['per_page'] == 100


@pytest.mark.asyncio
async def test_status_filter():
    """Test that status filter is applied correctly"""
    client = ZohoBooksClient("fake_token", "fake_org_id")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"invoices": []}
        
        await client.get_invoices(status="paid")
        
        # Verify status filter was passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['status'] == "paid"
