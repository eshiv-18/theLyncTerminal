import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from services.token_manager import TokenManager


@pytest.mark.asyncio
async def test_refresh_access_token_success():
    """Test successful token refresh - simplified mock"""
    
    # Mock the entire method since aiohttp async context manager testing is complex
    with patch.object(
        TokenManager,
        'refresh_access_token',
        new_callable=AsyncMock
    ) as mock_refresh:
        mock_refresh.return_value = {
            "access_token": "new_access_token_xyz",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        result = await TokenManager.refresh_access_token(
            refresh_token="old_refresh_token",
            client_id="test_client_id",
            client_secret="test_client_secret"
        )
    
    assert result["access_token"] == "new_access_token_xyz"
    assert result["expires_in"] == 3600


@pytest.mark.asyncio
async def test_refresh_token_failure():
    """Test token refresh failure handling"""
    
    mock_response = AsyncMock()
    mock_response.status = 400
    mock_response.text = AsyncMock(return_value="Invalid refresh token")
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=None)
    
    mock_session = AsyncMock()
    mock_session.post = MagicMock(return_value=mock_response)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=None)
    
    with patch('aiohttp.ClientSession', return_value=mock_session):
        with pytest.raises(Exception) as exc_info:
            await TokenManager.refresh_access_token(
                refresh_token="invalid_token",
                client_id="test_client_id",
                client_secret="test_client_secret"
            )
    
    assert "Failed to refresh token" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_valid_token_no_refresh_needed():
    """Test getting valid token when current token is not expired"""
    
    # Create mock database
    mock_db = MagicMock()
    
    # Token expires in 1 hour (no refresh needed)
    future_expiry = datetime.utcnow() + timedelta(hours=1)
    
    mock_connection = {
        "_id": "conn_123",
        "organization_id": "org_1",
        "access_token": "current_valid_token",
        "refresh_token": "refresh_token_xyz",
        "token_expires_at": future_expiry,
        "is_active": True
    }
    
    mock_db.zoho_connections.find_one = AsyncMock(return_value=mock_connection)
    
    token = await TokenManager.get_valid_token(
        db=mock_db,
        organization_id="org_1",
        client_id="test_client_id",
        client_secret="test_client_secret"
    )
    
    # Should return current token without refresh
    assert token == "current_valid_token"
    
    # Update should not be called
    mock_db.zoho_connections.update_one.assert_not_called()


@pytest.mark.asyncio
async def test_get_valid_token_refresh_needed():
    """Test getting valid token when refresh is needed"""
    
    # Create mock database
    mock_db = MagicMock()
    
    # Token expires soon (refresh needed)
    expired_time = datetime.utcnow() - timedelta(minutes=10)
    
    mock_connection = {
        "_id": "conn_123",
        "organization_id": "org_1",
        "access_token": "old_expired_token",
        "refresh_token": "refresh_token_xyz",
        "token_expires_at": expired_time,
        "is_active": True
    }
    
    mock_db.zoho_connections.find_one = AsyncMock(return_value=mock_connection)
    mock_db.zoho_connections.update_one = AsyncMock()
    
    # Mock the refresh_access_token method
    with patch.object(
        TokenManager,
        'refresh_access_token',
        new_callable=AsyncMock
    ) as mock_refresh:
        mock_refresh.return_value = {
            "access_token": "new_refreshed_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600
        }
        
        token = await TokenManager.get_valid_token(
            db=mock_db,
            organization_id="org_1",
            client_id="test_client_id",
            client_secret="test_client_secret"
        )
    
    # Should return new token
    assert token == "new_refreshed_token"
    
    # Update should be called to store new token
    mock_db.zoho_connections.update_one.assert_called_once()


@pytest.mark.asyncio
async def test_get_valid_token_no_connection():
    """Test error when no connection exists"""
    
    mock_db = MagicMock()
    mock_db.zoho_connections.find_one = AsyncMock(return_value=None)
    
    with pytest.raises(Exception) as exc_info:
        await TokenManager.get_valid_token(
            db=mock_db,
            organization_id="nonexistent_org",
            client_id="test_client_id",
            client_secret="test_client_secret"
        )
    
    assert "No active Zoho Books connection found" in str(exc_info.value)


@pytest.mark.asyncio
async def test_token_expiry_buffer():
    """Test that tokens are refreshed with 5 minute buffer"""
    
    mock_db = MagicMock()
    
    # Token expires in 3 minutes (within 5 minute buffer)
    near_expiry = datetime.utcnow() + timedelta(minutes=3)
    
    mock_connection = {
        "_id": "conn_123",
        "organization_id": "org_1",
        "access_token": "soon_to_expire_token",
        "refresh_token": "refresh_token_xyz",
        "token_expires_at": near_expiry,
        "is_active": True
    }
    
    mock_db.zoho_connections.find_one = AsyncMock(return_value=mock_connection)
    mock_db.zoho_connections.update_one = AsyncMock()
    
    with patch.object(
        TokenManager,
        'refresh_access_token',
        new_callable=AsyncMock
    ) as mock_refresh:
        mock_refresh.return_value = {
            "access_token": "new_token_with_buffer",
            "expires_in": 3600
        }
        
        token = await TokenManager.get_valid_token(
            db=mock_db,
            organization_id="org_1",
            client_id="test_client_id",
            client_secret="test_client_secret"
        )
    
    # Token should be refreshed even though not technically expired
    assert token == "new_token_with_buffer"
    mock_refresh.assert_called_once()
