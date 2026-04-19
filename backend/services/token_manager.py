import aiohttp
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


def get_accounts_domain(api_domain: str) -> str:
    """
    Convert Zoho API domain to Accounts domain for OAuth token operations.

    Zoho uses TWO separate domains:
      - API domain:      https://www.zohoapis.in   (for Books/CRM API calls)
      - Accounts domain: https://accounts.zoho.in  (for OAuth token refresh)

    The token_manager was previously using api_domain for token refresh,
    which hit zohoapis.in/oauth/v2/token — this endpoint does not exist,
    causing the "Invalid URL" error from Zoho CRM error page.

    Mapping:
      https://www.zohoapis.com    -> https://accounts.zoho.com
      https://www.zohoapis.in     -> https://accounts.zoho.in
      https://www.zohoapis.eu     -> https://accounts.zoho.eu
      https://www.zohoapis.com.au -> https://accounts.zoho.com.au
      https://www.zohoapis.jp     -> https://accounts.zoho.jp
    """
    if not api_domain:
        return "https://accounts.zoho.com"

    # Already an accounts domain — return as-is
    if "accounts.zoho" in api_domain:
        return api_domain.rstrip("/")

    # Convert zohoapis.X -> accounts.zoho.X
    domain = api_domain.rstrip("/")
    domain = domain.replace("https://www.zohoapis.", "https://accounts.zoho.")
    domain = domain.replace("http://www.zohoapis.", "https://accounts.zoho.")

    # Fallback if replacement didn't work
    if "zohoapis" in domain:
        logger.warning(f"Could not convert api_domain to accounts domain: {api_domain}, using default")
        return "https://accounts.zoho.com"

    return domain


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
        Refresh Zoho Books access token using refresh token.

        IMPORTANT: Token refresh must go to accounts.zoho.X, NOT zohoapis.X.
        The api_domain param is the Books API domain — we convert it here.
        """
        # FIX: Convert api domain to accounts domain for token operations
        accounts_domain = get_accounts_domain(api_domain)
        token_endpoint = f"{accounts_domain}/oauth/v2/token"

        logger.info(f"Refreshing token via: {token_endpoint}")

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
                    response_text = await response.text()

                    if response.status != 200:
                        logger.error(f"Token refresh failed [{response.status}]: {response_text[:500]}")
                        raise Exception(f"Failed to refresh token: {response_text[:300]}")

                    # Zoho returns JSON on success
                    try:
                        import json
                        token_data = json.loads(response_text)
                    except Exception:
                        raise Exception(f"Invalid JSON in token response: {response_text[:300]}")

                    if "error" in token_data:
                        raise Exception(f"Zoho token error: {token_data['error']}")

                    if "access_token" not in token_data:
                        raise Exception(f"No access_token in response: {token_data}")

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
        Get a valid access token for the organization, refreshing if necessary.
        Reads api_domain from DB connection if available (region-aware).
        """
        # Find active Zoho connection for organization
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })

        if not connection:
            raise Exception("No active Zoho Books connection found for organization")

        # FIX: Prefer api_domain stored on the connection (set during OAuth callback)
        # This is the correct regional domain saved from Zoho's token response
        effective_api_domain = connection.get("api_domain") or api_domain

        # Check if token is still valid (5 minute buffer)
        token_expires_at = connection.get("token_expires_at")

        if token_expires_at:
            # Handle both datetime and string formats
            if isinstance(token_expires_at, str):
                try:
                    token_expires_at = datetime.fromisoformat(token_expires_at.replace("Z", "+00:00"))
                    # Make naive for comparison
                    if token_expires_at.tzinfo:
                        token_expires_at = token_expires_at.replace(tzinfo=None)
                except Exception:
                    token_expires_at = None

        if token_expires_at and token_expires_at > (datetime.utcnow() + timedelta(minutes=5)):
            # Token is still valid
            return connection["access_token"]

        # Token expired or expiry unknown — refresh it
        logger.info(f"Refreshing Zoho token for organization {organization_id} using domain {effective_api_domain}")

        token_data = await TokenManager.refresh_access_token(
            refresh_token=connection["refresh_token"],
            client_id=client_id,
            client_secret=client_secret,
            api_domain=effective_api_domain
        )

        new_access_token = token_data["access_token"]
        new_refresh_token = token_data.get("refresh_token", connection["refresh_token"])
        expires_in = token_data.get("expires_in", 3600)
        new_expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))

        # Update DB with refreshed tokens
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