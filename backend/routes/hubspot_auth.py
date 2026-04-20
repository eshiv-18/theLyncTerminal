import aiohttp
import urllib.parse
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/hubspot", tags=["hubspot-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """Return HubSpot OAuth authorization URL."""
    settings = get_settings()

    if not settings.hubspot_client_id or not settings.hubspot_client_secret:
        raise HTTPException(
            status_code=500,
            detail="HubSpot integration not configured. Please set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET"
        )

    scopes = [
        "crm.objects.contacts.read",
        "crm.objects.companies.read",
        "crm.objects.deals.read",
        "crm.schemas.contacts.read",
        "crm.schemas.companies.read",
        "crm.schemas.deals.read",
    ]

    state = f"org_{organization_id}"

    auth_url = (
        f"https://app.hubspot.com/oauth/authorize?"
        f"client_id={settings.hubspot_client_id}&"
        f"redirect_uri={urllib.parse.quote(settings.hubspot_redirect_uri, safe='')}&"
        f"scope={urllib.parse.quote(' '.join(scopes))}&"
        f"state={state}"
    )

    return {
        "auth_url": auth_url,
        "message": "Redirect user to this URL to authorize HubSpot access"
    }


@router.get("/callback")
async def hubspot_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from HubSpot.
    FIX: Returns RedirectResponse (browser redirect) not JSON.
    """
    settings = get_settings()
    frontend_cb = f"{settings.frontend_url}/oauth/callback"

    # User denied access
    if error:
        logger.warning(f"HubSpot OAuth denied: {error}")
        msg = urllib.parse.quote(error_description or error)
        return RedirectResponse(
            url=f"{frontend_cb}?integration=hubspot&status=error&message={msg}"
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_cb}?integration=hubspot&status=error&message=no_code"
        )

    # Extract organization_id from state
    organization_id = "default_org"
    if state and state.startswith("org_"):
        organization_id = state.replace("org_", "", 1)

    logger.info(f"Processing HubSpot OAuth callback for organization: {organization_id}")

    try:
        # Exchange code for tokens
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.hubapi.com/oauth/v1/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.hubspot_client_id,
                    "client_secret": settings.hubspot_client_secret,
                    "redirect_uri": settings.hubspot_redirect_uri,
                    "code": code
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"HubSpot token exchange failed: {error_text}")
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=hubspot&status=error&message=token_exchange_failed"
                    )
                token_data = await response.json()

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 1800)

        if not access_token:
            return RedirectResponse(
                url=f"{frontend_cb}?integration=hubspot&status=error&message=no_access_token"
            )

        # Fetch HubSpot account details
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://api.hubapi.com/oauth/v1/access-tokens/{access_token}",
                timeout=aiohttp.ClientTimeout(total=30)
            ) as info_response:
                if info_response.status != 200:
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=hubspot&status=error&message=account_fetch_failed"
                    )
                token_info = await info_response.json()
                hub_id = str(token_info.get("hub_id", ""))
                hub_domain = token_info.get("hub_domain", "")
                user_email = token_info.get("user", "")

        # Upsert connection in DB
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        existing = await db.hubspot_connections.find_one({"organization_id": organization_id})

        update_doc = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": token_expires_at,
            "hub_id": hub_id,
            "hub_domain": hub_domain,
            "user_email": user_email,
            "updated_at": datetime.utcnow(),
            "is_active": True,
        }

        if existing:
            await db.hubspot_connections.update_one(
                {"organization_id": organization_id},
                {"$set": update_doc}
            )
            logger.info(f"Updated HubSpot connection for org {organization_id}")
        else:
            update_doc.update({
                "organization_id": organization_id,
                "user_id": "system",
                "created_at": datetime.utcnow(),
            })
            await db.hubspot_connections.insert_one(update_doc)
            logger.info(f"Created HubSpot connection for org {organization_id}")

        return RedirectResponse(
            url=f"{frontend_cb}?integration=hubspot&status=success&org={organization_id}"
        )

    except Exception as e:
        logger.error(f"HubSpot OAuth callback error: {str(e)}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_cb}?integration=hubspot&status=error&message={urllib.parse.quote(str(e)[:120])}"
        )


@router.get("/status")
async def check_connection_status(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    connection = await db.hubspot_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not connection:
        return {"connected": False, "message": "No active HubSpot connection"}

    return {
        "connected": True,
        "hubspot_account": {
            "hub_id": connection.get("hub_id"),
            "hub_domain": connection.get("hub_domain"),
            "user_email": connection.get("user_email"),
        },
        "last_updated": connection.get("updated_at"),
    }


# FIX: was missing — frontend calls DELETE /disconnect
@router.delete("/disconnect")
async def disconnect_hubspot(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.hubspot_connections.update_one(
        {"organization_id": organization_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No HubSpot connection found")

    return {"status": "success", "message": "HubSpot disconnected successfully"}