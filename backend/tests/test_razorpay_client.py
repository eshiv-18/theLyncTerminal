import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime
from services.razorpay_client import RazorpayClient


@pytest.mark.asyncio
async def test_razorpay_client_initialization():
    """Test RazorpayClient initialization"""
    client = RazorpayClient(
        key_id="rzp_test_key123",
        key_secret="secret_key_456"
    )
    
    assert client.key_id == "rzp_test_key123"
    assert client.key_secret == "secret_key_456"
    assert client.base_url == "https://api.razorpay.com/v1"
    assert client.auth_header is not None  # Base64 encoded auth


@pytest.mark.asyncio
async def test_create_order_success():
    """Test successful order creation"""
    mock_response = {
        "id": "order_ABC123",
        "entity": "order",
        "amount": 50000,
        "amount_paid": 0,
        "amount_due": 50000,
        "currency": "INR",
        "receipt": "receipt_001",
        "status": "created"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.create_order(
            amount=50000,
            currency="INR",
            receipt="receipt_001"
        )
        
        assert result["id"] == "order_ABC123"
        assert result["amount"] == 50000
        assert result["status"] == "created"
        mock_request.assert_called_once()


@pytest.mark.asyncio
async def test_get_payments_success():
    """Test successful payments retrieval"""
    mock_response = {
        "entity": "collection",
        "count": 2,
        "items": [
            {
                "id": "pay_123",
                "amount": 50000,
                "currency": "INR",
                "status": "captured",
                "method": "card"
            },
            {
                "id": "pay_456",
                "amount": 75000,
                "currency": "INR",
                "status": "captured",
                "method": "upi"
            }
        ]
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_payments(count=100)
        
        assert result["count"] == 2
        assert len(result["items"]) == 2
        assert result["items"][0]["amount"] == 50000


@pytest.mark.asyncio
async def test_get_payment_by_id_success():
    """Test fetching a specific payment by ID"""
    mock_response = {
        "id": "pay_XYZ789",
        "amount": 100000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_ABC123",
        "method": "netbanking"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_payment("pay_XYZ789")
        
        assert result["id"] == "pay_XYZ789"
        assert result["amount"] == 100000
        assert result["status"] == "captured"


@pytest.mark.asyncio
async def test_capture_payment_success():
    """Test capturing an authorized payment"""
    mock_response = {
        "id": "pay_123",
        "amount": 50000,
        "currency": "INR",
        "status": "captured"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.capture_payment(
            payment_id="pay_123",
            amount=50000
        )
        
        assert result["status"] == "captured"
        assert result["amount"] == 50000


@pytest.mark.asyncio
async def test_get_subscriptions_success():
    """Test successful subscriptions retrieval"""
    mock_response = {
        "entity": "collection",
        "count": 1,
        "items": [
            {
                "id": "sub_123",
                "plan_id": "plan_ABC",
                "status": "active",
                "current_start": 1609459200,
                "current_end": 1612137600
            }
        ]
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_subscriptions()
        
        assert result["count"] == 1
        assert result["items"][0]["status"] == "active"


@pytest.mark.asyncio
async def test_get_subscription_by_id_success():
    """Test fetching a specific subscription"""
    mock_response = {
        "id": "sub_456",
        "plan_id": "plan_XYZ",
        "status": "active"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_subscription("sub_456")
        
        assert result["id"] == "sub_456"
        assert result["status"] == "active"


@pytest.mark.asyncio
async def test_cancel_subscription_success():
    """Test canceling a subscription"""
    mock_response = {
        "id": "sub_789",
        "status": "cancelled"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.cancel_subscription("sub_789")
        
        assert result["status"] == "cancelled"


@pytest.mark.asyncio
async def test_get_customers_success():
    """Test successful customers retrieval"""
    mock_response = {
        "entity": "collection",
        "count": 2,
        "items": [
            {
                "id": "cust_123",
                "name": "John Doe",
                "email": "john@example.com"
            },
            {
                "id": "cust_456",
                "name": "Jane Smith",
                "email": "jane@example.com"
            }
        ]
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_customers()
        
        assert result["count"] == 2
        assert len(result["items"]) == 2


@pytest.mark.asyncio
async def test_create_customer_success():
    """Test creating a new customer"""
    mock_response = {
        "id": "cust_NEW",
        "name": "New Customer",
        "email": "new@example.com",
        "contact": "+919876543210"
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.create_customer(
            name="New Customer",
            email="new@example.com",
            contact="+919876543210"
        )
        
        assert result["id"] == "cust_NEW"
        assert result["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_get_invoices_success():
    """Test successful invoices retrieval"""
    mock_response = {
        "entity": "collection",
        "count": 1,
        "items": [
            {
                "id": "inv_123",
                "customer_id": "cust_ABC",
                "amount": 100000,
                "status": "paid"
            }
        ]
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_invoices()
        
        assert result["count"] == 1
        assert result["items"][0]["status"] == "paid"


@pytest.mark.asyncio
async def test_verify_webhook_signature():
    """Test webhook signature verification"""
    payload = b'{"event":"payment.captured"}'
    secret = "webhook_secret_123"
    
    # Generate a valid signature
    import hmac
    import hashlib
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    # Test valid signature
    is_valid = RazorpayClient.verify_webhook_signature(
        payload, expected_signature, secret
    )
    
    assert is_valid is True
    
    # Test invalid signature
    is_invalid = RazorpayClient.verify_webhook_signature(
        payload, "wrong_signature", secret
    )
    
    assert is_invalid is False


@pytest.mark.asyncio
async def test_unauthorized_error():
    """Test handling of 401 unauthorized error"""
    client = RazorpayClient("invalid_key", "invalid_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("Unauthorized - invalid API credentials")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_payments()
        
        assert "Unauthorized" in str(exc_info.value)


@pytest.mark.asyncio
async def test_api_error_handling():
    """Test general API error handling"""
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("API error: Bad request")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_payments()
        
        assert "API error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_all_payments_with_pagination():
    """Test fetching all payments with pagination"""
    mock_response_page1 = {
        "items": [{"id": f"pay_{i}", "amount": 1000} for i in range(100)]
    }
    
    mock_response_page2 = {
        "items": [{"id": f"pay_{i}", "amount": 1000} for i in range(100, 150)]
    }
    
    mock_response_page3 = {
        "items": []
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, 'get_payments', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [
            mock_response_page1,
            mock_response_page2,
            mock_response_page3
        ]
        
        result = await client.get_all_payments(max_results=200)
        
        assert len(result) == 150
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_get_all_subscriptions_with_pagination():
    """Test fetching all subscriptions with pagination"""
    mock_response = {
        "items": [{"id": f"sub_{i}"} for i in range(25)]
    }
    
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, 'get_subscriptions', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        result = await client.get_all_subscriptions(max_results=25)
        
        assert len(result) == 25
        assert mock_get.call_count == 1


@pytest.mark.asyncio
async def test_pagination_parameters():
    """Test that pagination parameters are passed correctly"""
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"items": []}
        
        await client.get_payments(count=50, skip=100)
        
        # Verify pagination params were passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['count'] == 50
        assert call_params['skip'] == 100


@pytest.mark.asyncio
async def test_timestamp_filters():
    """Test that timestamp filters are applied correctly"""
    client = RazorpayClient("fake_key", "fake_secret")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"items": []}
        
        from_ts = 1609459200
        to_ts = 1612137600
        
        await client.get_payments(from_timestamp=from_ts, to_timestamp=to_ts)
        
        # Verify timestamp filters were passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['from'] == from_ts
        assert call_params['to'] == to_ts
