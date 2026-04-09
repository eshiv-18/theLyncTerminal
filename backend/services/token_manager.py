import aiohttp
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


class TokenManager:
    """Manages OAuth token refresh for Zoho Books"""
    
    @staticmethod
    async def refresh_access_token(
        refresh_token: str,
        client_id: str,
        client_secret: str,
        api_domain: str = "https://www.zohoapis.com"
    ) -> dict:
        """
        Refresh Zoho Books access token using refresh token
        
        Returns:
            dict with 'access_token', 'expires_in', and optionally 'refresh_token'
        """
        token_endpoint = f"{api_domain}/oauth/v2/token"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    token_endpoint,
                    data={
                        "grant_type": "refresh_token",
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "refresh_token": refresh_token
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Token refresh failed: {error_text}")
                        raise Exception(f"Failed to refresh token: {error_text}")
                    
                    token_data = await response.json()
                    return token_data
        
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            raise Exception(f"Token refresh failed: {str(e)}")
    
    @staticmethod
    async def get_valid_token(
        db: AsyncIOMotorDatabase,
        organization_id: str,
        client_id: str,
        client_secret: str,
        api_domain: str = "https://www.zohoapis.com"
    ) -> str:
        """
        Get a valid access token for the organization, refreshing if necessary
        
        Args:
            db: MongoDB database instance
            organization_id: The startup organization ID
            client_id: Zoho OAuth client ID
            client_secret: Zoho OAuth client secret
            api_domain: Zoho API domain
            
        Returns:
            Valid access token string
        """
        # Find active Zoho connection for organization
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        if not connection:
            raise Exception("No active Zoho Books connection found for organization")
        
        # Check if token is expired or about to expire (5 minute buffer)
        token_expires_at = connection["token_expires_at"]
        buffer_time = datetime.utcnow() + timedelta(minutes=5)
        
        if token_expires_at > buffer_time:
            # Token is still valid
            return connection["access_token"]
        
        # Token is expired or about to expire, refresh it
        logger.info(f"Refreshing token for organization {organization_id}")
        
        token_data = await TokenManager.refresh_access_token(
            refresh_token=connection["refresh_token"],
            client_id=client_id,
            client_secret=client_secret,
            api_domain=api_domain
        )
        
        new_access_token = token_data["access_token"]
        new_refresh_token = token_data.get("refresh_token", connection["refresh_token"])
        expires_in = token_data.get("expires_in", 3600)
        
        # Update database with new tokens
        new_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        await db.zoho_connections.update_one(
            {"_id": connection["_id"]},
            {
                "$set": {
                    "access_token": new_access_token,
                    "refresh_token": new_refresh_token,
                    "token_expires_at": new_expires_at,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Token refreshed successfully for organization {organization_id}")
        return new_access_token
