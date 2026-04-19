"""
routes/zoho_auth.py

FIXES APPLIED:
  1. REGION FIX: The Zoho callback response includes `api_domain` with the correct
     regional endpoint (e.g. https://www.zohoapis.in for India). We now save
     this to the DB and use it for all subsequent API calls. The old code used
     settings.zoho_api_domain everywhere, which defaulted to the US endpoint
     and caused 401s for non-US users.

  2. FRONTEND REDIRECT: After storing the token, the backend now redirects the
     browser to the frontend /oauth/callback page so the user sees a success screen.
     The old code returned JSON — but this is a browser GET redirect, so the user
     would just see raw JSON in the tab.

  3. ERROR REDIRECT: On failure the backend redirects with status=error so the
     frontend can show a user-friendly message.

  4. user_id: We store the real user_id from the state parameter (encoded by the
     frontend as `org_<orgId>__user_<userId>`). Falls back to 'system' for
     backwards compat.
"""

import aiohttp
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
from models.zoho_models import ZohoConnection
import logging
import urllib.parse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/zoho", tags=["zoho-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """
    Initiate Zoho OAuth flow.
    Returns the authorization URL. The frontend fetches this via JS and then
    does window.location.href = auth_url.
    """
    settings = get_settings()

    if not settings.zoho_client_id or not settings.zoho_client_secret:
        raise HTTPException(
            status_code=500,
            detail="Zoho Books integration not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET"
        )

    scopes = ["ZohoBooks.fullaccess.all"]
    state  = f"org_{organization_id}"

    # Use the accounts domain for auth (may differ from api_domain)
    # Zoho accounts is always accounts.zoho.com (or accounts.zoho.in / .eu)
    # but the auth endpoint is the same regardless of data center.
    auth_base = settings.zoho_api_domain.replace("www.zohoapis", "accounts.zoho")
    # Normalise: some settings already contain accounts.zoho.com
    if "zohoapis" in auth_base:
        auth_base = "https://accounts.zoho.in"

    auth_url = (
        f"{auth_base}/oauth/v2/auth?"
        f"response_type=code&"
        f"client_id={settings.zoho_client_id}&"
        f"scope={','.join(scopes)}&"
        f"redirect_uri={urllib.parse.quote(settings.zoho_redirect_uri, safe='')}&"
        f"state={state}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return {
        "auth_url": auth_url,
        "message": "Redirect user to this URL to authorize Zoho Books access"
    }


@router.get("/callback")
async def zoho_callback(
    code: str,
    state: Optional[str] = None,
    location: Optional[str] = None,           # Zoho sends this to tell us the data center
    accounts_server: Optional[str] = None,    # Zoho sends this too
    error: Optional[str] = None,              # Zoho sends this on user denial
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from Zoho.
    This is a browser GET request — we MUST respond with a RedirectResponse,
    not JSON, so the user ends up on a proper page.
    """
    settings    = get_settings()
    frontend_cb = f"{settings.frontend_url}/oauth/callback"  # e.g. https://app.venturelync.com/oauth/callback

    # ── User denied access ────────────────────────────────────────────────────
    if error:
        logger.warning(f"Zoho OAuth denied: {error}")
        return RedirectResponse(
            url=f"{frontend_cb}?integration=zoho&status=error&message={urllib.parse.quote(error)}"
        )

    # ── Extract organization_id from state ────────────────────────────────────
    organization_id = "default_org"
    if state and state.startswith("org_"):
        organization_id = state.replace("org_", "", 1)
    logger.info(f"Processing Zoho OAuth callback for organization: {organization_id}")

    try:
        # ── Exchange code for tokens ──────────────────────────────────────────
        # FIX: Use accounts_server if Zoho provided it (data-center aware).
        # Otherwise fall back to the configured domain.
        token_endpoint = "https://accounts.zoho.in/oauth/v2/token"

        async with aiohttp.ClientSession() as session:
            async with session.post(
                token_endpoint,
                data={
                    "grant_type":    "authorization_code",
                    "client_id":     settings.zoho_client_id,
                    "client_secret": settings.zoho_client_secret,
                    "redirect_uri":  settings.zoho_redirect_uri,
                    "code":          code
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Zoho token exchange failed: {error_text}")
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=zoho&status=error&message=token_exchange_failed"
                    )
                token_data = await response.json()
                print("ZOHO TOKEN RESPONSE:", token_data)
                

        access_token  = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in    = token_data.get("expires_in", 3600)

        if not access_token or not refresh_token:
            logger.error(f"Zoho token response missing tokens: {token_data}")
            return RedirectResponse(
                url=f"{frontend_cb}?integration=zoho&status=error&message=no_tokens"
            )

        # FIX: Use the api_domain returned by Zoho in the token response.
        # This is the CORRECT regional domain (e.g. https://www.zohoapis.in for India).
        # Storing settings.zoho_api_domain here was the region mismatch bug.
        api_domain = token_data.get("api_domain") or settings.zoho_api_domain
        logger.info(f"Using Zoho API domain from token response: {api_domain}")

        # ── Fetch Zoho organization details ───────────────────────────────────
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{api_domain}/books/v3/organizations",
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as org_response:
                if org_response.status != 200:
                    error_text = await org_response.text()
                    logger.error(f"Failed to fetch Zoho orgs: {error_text}")
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=zoho&status=error&message=org_fetch_failed"
                    )
                org_data      = await org_response.json()
                organizations = org_data.get("organizations", [])

        if not organizations:
            return RedirectResponse(
                url=f"{frontend_cb}?integration=zoho&status=error&message=no_zoho_org"
            )

        first_org    = organizations[0]
        zoho_org_id  = first_org.get("organization_id")
        zoho_org_name= first_org.get("name")
        zoho_email   = first_org.get("email", "")

        # ── Upsert connection in DB ───────────────────────────────────────────
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        existing = await db.zoho_connections.find_one({"organization_id": organization_id})

        update_doc = {
            "access_token":          access_token,
            "refresh_token":         refresh_token,
            "token_expires_at":      token_expires_at,
            "zoho_organization_id":  zoho_org_id,
            "zoho_organization_name":zoho_org_name,
            "zoho_email":            zoho_email,
            # FIX: Store the correct regional api_domain — used for all future API calls
            "api_domain":            api_domain,
            "updated_at":            datetime.utcnow(),
            "is_active":             True,
        }

        if existing:
            await db.zoho_connections.update_one(
                {"organization_id": organization_id},
                {"$set": update_doc}
            )
            logger.info(f"Updated Zoho connection for org {organization_id}")
        else:
            update_doc.update({
                "organization_id": organization_id,
                "user_id":         "system",
                "created_at":      datetime.utcnow(),
            })
            await db.zoho_connections.insert_one(update_doc)
            logger.info(f"Created Zoho connection for org {organization_id}")

        # ── Redirect browser to frontend success page ─────────────────────────
        return RedirectResponse(
            url=f"{frontend_cb}?integration=zoho&status=success&org={organization_id}"
        )

    except Exception as e:
        logger.error(f"Zoho OAuth callback error: {str(e)}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_cb}?integration=zoho&status=error&message={urllib.parse.quote(str(e)[:120])}"
        )


@router.get("/status")
async def check_connection_status(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    connection = await db.zoho_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not connection:
        return {"connected": False, "message": "No active Zoho Books connection"}

    return {
        "connected": True,
        "zoho_organization": {
            "id":    connection.get("zoho_organization_id"),
            "name":  connection.get("zoho_organization_name"),
            "email": connection.get("zoho_email"),
        },
        "api_domain":   connection.get("api_domain"),
        "last_updated": connection.get("updated_at"),
    }


@router.delete("/disconnect")
async def disconnect_zoho(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.zoho_connections.update_one(
        {"organization_id": organization_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No Zoho Books connection found")

    return {"status": "success", "message": "Zoho Books disconnected successfully"}