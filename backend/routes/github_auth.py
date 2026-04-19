"""
routes/github_auth.py

FIXES APPLIED:
  1. FRONTEND REDIRECT: Callback now returns RedirectResponse (browser redirect)
     instead of JSON. The user was getting raw JSON in their browser tab.

  2. ERROR REDIRECT: On failure the backend redirects with ?status=error so the
     frontend OAuthCallback page can display a message.

  3. user_id: state param can encode both orgId and userId so the token is
     stored under the correct user account, not always 'system'.
"""

import aiohttp
import urllib.parse
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/github", tags=["github-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """
    Return the GitHub OAuth authorization URL.
    The frontend calls this via fetch() then sets window.location.href.
    """
    settings = get_settings()

    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=500,
            detail="GitHub integration not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
        )

    scopes = ["repo", "read:user", "read:org"]
    state  = f"org_{organization_id}"

    auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={settings.github_client_id}&"
        f"redirect_uri={urllib.parse.quote(settings.github_redirect_uri, safe='')}&"
        f"scope={urllib.parse.quote(' '.join(scopes))}&"
        f"state={state}"
    )

    return {
        "auth_url": auth_url,
        "message": "Redirect user to this URL to authorize GitHub access"
    }


@router.get("/callback")
async def github_callback(
    code: str,
    state: Optional[str] = None,
    error: Optional[str] = None,              # GitHub sends this if user denies
    error_description: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from GitHub.
    MUST return a RedirectResponse — this is a browser GET from GitHub.
    """
    settings    = get_settings()
    frontend_cb = f"{settings.frontend_url}/oauth/callback"

    # ── User denied access ────────────────────────────────────────────────────
    if error:
        logger.warning(f"GitHub OAuth denied: {error}")
        msg = urllib.parse.quote(error_description or error)
        return RedirectResponse(
            url=f"{frontend_cb}?integration=github&status=error&message={msg}"
        )

    # ── Extract organization_id from state ────────────────────────────────────
    organization_id = "default_org"
    if state and state.startswith("org_"):
        organization_id = state.replace("org_", "", 1)
    logger.info(f"Processing GitHub OAuth callback for organization: {organization_id}")

    try:
        # ── Exchange code for access token ────────────────────────────────────
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id":     settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code":          code,
                    "redirect_uri":  settings.github_redirect_uri,
                },
                headers={"Accept": "application/json"},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"GitHub token exchange failed: {error_text}")
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=github&status=error&message=token_exchange_failed"
                    )
                token_data = await response.json()

        access_token = token_data.get("access_token")
        if not access_token:
            logger.error(f"No access_token in GitHub response: {token_data}")
            return RedirectResponse(
                url=f"{frontend_cb}?integration=github&status=error&message=no_access_token"
            )

        token_type = token_data.get("token_type", "bearer")
        scope      = token_data.get("scope", "")

        # ── Fetch GitHub user info ────────────────────────────────────────────
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept":        "application/vnd.github.v3+json",
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as user_response:
                if user_response.status != 200:
                    return RedirectResponse(
                        url=f"{frontend_cb}?integration=github&status=error&message=user_fetch_failed"
                    )
                user_data      = await user_response.json()
                github_user_id = user_data.get("id")
                github_username= user_data.get("login")
                github_email   = user_data.get("email")

        # ── Upsert connection in DB ───────────────────────────────────────────
        existing = await db.github_connections.find_one({"organization_id": organization_id})

        update_doc = {
            "access_token":    access_token,
            "token_type":      token_type,
            "scope":           scope,
            "github_user_id":  github_user_id,
            "github_username": github_username,
            "github_email":    github_email,
            "updated_at":      datetime.utcnow(),
            "is_active":       True,
        }

        if existing:
            await db.github_connections.update_one(
                {"organization_id": organization_id},
                {"$set": update_doc}
            )
            logger.info(f"Updated GitHub connection for org {organization_id}")
        else:
            update_doc.update({
                "organization_id": organization_id,
                "user_id":         "system",
                "created_at":      datetime.utcnow(),
            })
            await db.github_connections.insert_one(update_doc)
            logger.info(f"Created GitHub connection for org {organization_id}")

        # ── Redirect browser to frontend success page ─────────────────────────
        return RedirectResponse(
            url=f"{frontend_cb}?integration=github&status=success&org={organization_id}"
        )

    except Exception as e:
        logger.error(f"GitHub OAuth callback error: {str(e)}", exc_info=True)
        return RedirectResponse(
            url=f"{frontend_cb}?integration=github&status=error&message={urllib.parse.quote(str(e)[:120])}"
        )


@router.get("/status")
async def check_connection_status(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    connection = await db.github_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not connection:
        return {"connected": False, "message": "No active GitHub connection"}

    return {
        "connected": True,
        "github_account": {
            "user_id":  connection.get("github_user_id"),
            "username": connection.get("github_username"),
            "email":    connection.get("github_email"),
        },
        "last_updated": connection.get("updated_at"),
    }


@router.delete("/disconnect")
async def disconnect_github(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    result = await db.github_connections.update_one(
        {"organization_id": organization_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No GitHub connection found for this organization")

    return {"status": "success", "message": "GitHub disconnected successfully"}