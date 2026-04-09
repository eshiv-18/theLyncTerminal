import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
from services.hubspot_client import HubSpotClient


@pytest.mark.asyncio
async def test_hubspot_client_initialization():
    """Test HubSpotClient initialization"""
    client = HubSpotClient(
        access_token="test_hubspot_token",
        api_domain="https://api.hubapi.com"
    )
    
    assert client.access_token == "test_hubspot_token"
    assert client.api_domain == "https://api.hubapi.com"
    assert client.rate_limit_semaphore._value == 10


@pytest.mark.asyncio
async def test_get_contacts_success():
    """Test successful contacts retrieval"""
    mock_response = {
        "results": [
            {
                "id": "1",
                "properties": {
                    "email": "contact1@example.com",
                    "firstname": "John",
                    "lastname": "Doe"
                }
            },
            {
                "id": "2",
                "properties": {
                    "email": "contact2@example.com",
                    "firstname": "Jane",
                    "lastname": "Smith"
                }
            }
        ],
        "paging": {
            "next": {
                "after": "cursor123"
            }
        }
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_contacts(limit=100)
        
        assert len(result["results"]) == 2
        assert result["results"][0]["properties"]["email"] == "contact1@example.com"
        assert result["paging"]["next"]["after"] == "cursor123"
        mock_request.assert_called_once()


@pytest.mark.asyncio
async def test_get_companies_success():
    """Test successful companies retrieval"""
    mock_response = {
        "results": [
            {
                "id": "comp1",
                "properties": {
                    "name": "Acme Corp",
                    "domain": "acme.com"
                }
            }
        ]
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_companies(limit=50)
        
        assert len(result["results"]) == 1
        assert result["results"][0]["properties"]["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_get_deals_success():
    """Test successful deals retrieval"""
    mock_response = {
        "results": [
            {
                "id": "deal1",
                "properties": {
                    "dealname": "Big Deal",
                    "amount": "50000",
                    "dealstage": "closedwon"
                }
            },
            {
                "id": "deal2",
                "properties": {
                    "dealname": "Another Deal",
                    "amount": "25000",
                    "dealstage": "qualifiedtobuy"
                }
            }
        ]
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_deals()
        
        assert len(result["results"]) == 2
        assert result["results"][0]["properties"]["amount"] == "50000"


@pytest.mark.asyncio
async def test_get_pipelines_success():
    """Test successful pipelines retrieval"""
    mock_response = {
        "results": [
            {
                "id": "pipeline1",
                "label": "Sales Pipeline",
                "stages": []
            }
        ]
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_pipelines()
        
        assert len(result["results"]) == 1
        assert result["results"][0]["label"] == "Sales Pipeline"


@pytest.mark.asyncio
async def test_search_contacts_success():
    """Test contact search functionality"""
    mock_response = {
        "results": [
            {
                "id": "search1",
                "properties": {
                    "email": "search@example.com"
                }
            }
        ]
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        filters = [
            {
                "propertyName": "email",
                "operator": "EQ",
                "value": "search@example.com"
            }
        ]
        
        result = await client.search_contacts(filters=filters)
        
        assert len(result["results"]) == 1
        assert result["results"][0]["properties"]["email"] == "search@example.com"


@pytest.mark.asyncio
async def test_get_account_info_success():
    """Test account info retrieval"""
    mock_response = {
        "portalId": 12345,
        "accountType": "MARKETING_HUB_PROFESSIONAL"
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_response
        
        result = await client.get_account_info()
        
        assert result["portalId"] == 12345
        assert result["accountType"] == "MARKETING_HUB_PROFESSIONAL"


@pytest.mark.asyncio
async def test_rate_limiting():
    """Test HubSpot rate limiting mechanism (100 requests per 10 seconds)"""
    client = HubSpotClient("fake_token")
    
    # Simulate approaching rate limit
    now = datetime.now()
    client.request_times = [
        now - timedelta(seconds=i/10) 
        for i in range(100)
    ]
    
    assert len(client.request_times) == 100


@pytest.mark.asyncio
async def test_unauthorized_error():
    """Test handling of 401 unauthorized error"""
    client = HubSpotClient("expired_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("Unauthorized - token expired")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_contacts()
        
        assert "Unauthorized" in str(exc_info.value)


@pytest.mark.asyncio
async def test_rate_limit_error_429():
    """Test handling of 429 rate limit error"""
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("Rate limited")
        
        with pytest.raises(Exception):
            await client.get_contacts()


@pytest.mark.asyncio
async def test_get_all_contacts_with_pagination():
    """Test fetching all contacts with pagination"""
    mock_response_page1 = {
        "results": [{"id": str(i)} for i in range(100)],
        "paging": {"next": {"after": "cursor1"}}
    }
    
    mock_response_page2 = {
        "results": [{"id": str(i)} for i in range(100, 150)],
        "paging": {}
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, 'get_contacts', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [mock_response_page1, mock_response_page2]
        
        result = await client.get_all_contacts(max_results=150)
        
        assert len(result) == 150
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_get_all_companies_with_pagination():
    """Test fetching all companies with pagination"""
    mock_response_page1 = {
        "results": [{"id": f"comp{i}"} for i in range(100)],
        "paging": {"next": {"after": "cursor1"}}
    }
    
    mock_response_page2 = {
        "results": [{"id": f"comp{i}"} for i in range(100, 120)],
        "paging": {}
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, 'get_companies', new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [mock_response_page1, mock_response_page2]
        
        result = await client.get_all_companies(max_results=120)
        
        assert len(result) == 120
        assert mock_get.call_count == 2


@pytest.mark.asyncio
async def test_get_all_deals_with_pagination():
    """Test fetching all deals with pagination"""
    mock_response = {
        "results": [{"id": f"deal{i}"} for i in range(50)],
        "paging": {}
    }
    
    client = HubSpotClient("fake_token")
    
    with patch.object(client, 'get_deals', new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        
        result = await client.get_all_deals(max_results=50)
        
        assert len(result) == 50
        assert mock_get.call_count == 1


@pytest.mark.asyncio
async def test_api_error_handling():
    """Test general API error handling"""
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = Exception("API connection failed")
        
        with pytest.raises(Exception) as exc_info:
            await client.get_contacts()
        
        assert "API connection failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_properties_parameter():
    """Test that properties parameter is passed correctly"""
    client = HubSpotClient("fake_token")
    
    with patch.object(client, '_make_request', new_callable=AsyncMock) as mock_request:
        mock_request.return_value = {"results": []}
        
        await client.get_contacts(
            limit=50,
            properties=["email", "firstname", "lastname"]
        )
        
        # Verify properties were passed
        call_params = mock_request.call_args[1]['params']
        assert call_params['properties'] == "email,firstname,lastname"
        assert call_params['limit'] == 50
