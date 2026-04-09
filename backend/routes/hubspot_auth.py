import aiohttp
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/hubspot", tags=["hubspot-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """
    Initiate HubSpot OAuth flow
    
    Args:
        organization_id: The startup organization ID requesting connection
    
    Returns:
        Authorization URL to redirect user to
    """
    settings = get_settings()
    
    if not settings.hubspot_client_id or not settings.hubspot_client_secret:
        raise HTTPException(
            status_code=500,
            detail="HubSpot integration not configured. Please set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET"
        )
    
    # Required scopes for CRM access
    scopes = [
        "crm.objects.contacts.read",
        "crm.objects.contacts.write",
        "crm.objects.companies.read",
        "crm.objects.companies.write",
        "crm.objects.deals.read",
        "crm.objects.deals.write",
        "crm.schemas.contacts.read",
        "crm.schemas.companies.read",
        "crm.schemas.deals.read"
    ]
    
    # Store organization_id in state parameter
    state = f"org_{organization_id}"
    
    auth_url = (
        f"https://app.hubspot.com/oauth/authorize?"
        f"client_id={settings.hubspot_client_id}&"
        f"redirect_uri={settings.hubspot_redirect_uri}&"
        f"scope={' '.join(scopes)}&"
        f"state={state}"
    )
    
    return {
        "auth_url": auth_url,
        "message": "Redirect user to this URL to authorize HubSpot access"
    }


@router.get("/callback")
async def hubspot_callback(
    code: str,
    state: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from HubSpot
    
    Args:
        code: Authorization code from HubSpot
        state: State parameter containing organization_id
        db: MongoDB database instance
    """
    settings = get_settings()
    
    try:
        # Extract organization_id from state
        organization_id = "default_org"
        if state and state.startswith("org_"):
            organization_id = state.replace("org_", "")
        
        logger.info(f"Processing HubSpot OAuth callback for organization: {organization_id}")
        
        # Exchange authorization code for tokens
        token_endpoint = "https://api.hubapi.com/oauth/v1/token"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                token_endpoint,
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
                    logger.error(f"Token exchange failed: {error_text}")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to exchange authorization code: {error_text}"
                    )
                
                token_data = await response.json()
        
        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]
        expires_in = token_data.get("expires_in", 1800)  # HubSpot tokens expire in 30 min
        
        # Fetch HubSpot account details
        logger.info("Fetching HubSpot account information...")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.hubapi.com/oauth/v1/access-tokens/" + access_token,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as token_info_response:
                if token_info_response.status == 200:
                    token_info = await token_info_response.json()
                    hub_id = str(token_info.get("hub_id"))
                    hub_domain = token_info.get("hub_domain")
                    user_email = token_info.get("user", "")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Failed to fetch HubSpot account information"
                    )
        
        # Save connection to database
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Check if connection already exists
        existing_connection = await db.hubspot_connections.find_one({
            "organization_id": organization_id
        })
        
        if existing_connection:
            # Update existing connection
            await db.hubspot_connections.update_one(
                {"organization_id": organization_id},
                {
                    "$set": {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "token_expires_at": token_expires_at,
                        "hub_id": hub_id,
                        "hub_domain": hub_domain,
                        "user_email": user_email,
                        "updated_at": datetime.utcnow(),
                        "is_active": True
                    }
                }
            )
            logger.info(f"Updated HubSpot connection for organization {organization_id}")
            connection_id = str(existing_connection["_id"])
        else:
            # Create new connection
            hubspot_connection = {
                "organization_id": organization_id,
                "user_id": "system",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": token_expires_at,
                "hub_id": hub_id,
                "hub_domain": hub_domain,
                "user_email": user_email,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            
            result = await db.hubspot_connections.insert_one(hubspot_connection)
            logger.info(f"Created HubSpot connection for organization {organization_id}")
            connection_id = str(result.inserted_id)
        
        return {
            "status": "success",
            "message": "HubSpot CRM connected successfully",
            "connection_id": connection_id,
            "hubspot_account": {
                "hub_id": hub_id,
                "hub_domain": hub_domain,
                "user_email": user_email
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HubSpot OAuth callback error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/status")
async def check_connection_status(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Check if organization has an active HubSpot connection
    
    Args:
        organization_id: The startup organization ID
    """
    connection = await db.hubspot_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        return {
            "connected": False,
            "message": "No active HubSpot connection"
        }
    
    return {
        "connected": True,
        "hubspot_account": {
            "hub_id": connection.get("hub_id"),
            "hub_domain": connection.get("hub_domain"),
            "user_email": connection.get("user_email")
        },
        "last_updated": connection.get("updated_at")
    }


@router.delete("/disconnect")
async def disconnect_hubspot(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Disconnect HubSpot integration for an organization
    
    Args:
        organization_id: The startup organization ID
    """
    result = await db.hubspot_connections.update_one(
        {"organization_id": organization_id},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="No HubSpot connection found for this organization"
        )
    
    return {
        "status": "success",
        "message": "HubSpot disconnected successfully"
    }
