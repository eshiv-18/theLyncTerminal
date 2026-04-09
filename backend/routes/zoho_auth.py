import aiohttp
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
from models.zoho_models import ZohoConnection
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/zoho", tags=["zoho-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """
    Initiate Zoho OAuth flow
    
    Args:
        organization_id: The startup organization ID requesting connection
    
    Returns:
        Authorization URL to redirect user to
    """
    settings = get_settings()
    
    if not settings.zoho_client_id or not settings.zoho_client_secret:
        raise HTTPException(
            status_code=500,
            detail="Zoho Books integration not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET"
        )
    
    # Build authorization URL with required scopes
    scopes = [
        "ZohoBooks.fullaccess.all"  # Full access scope for financial data
    ]
    
    # Store organization_id in state parameter for callback
    state = f"org_{organization_id}"
    
    auth_url = (
        f"{settings.zoho_api_domain}/oauth/v2/auth?"
        f"response_type=code&"
        f"client_id={settings.zoho_client_id}&"
        f"scope={','.join(scopes)}&"
        f"redirect_uri={settings.zoho_redirect_uri}&"
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
    location: Optional[str] = None,
    accounts_server: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from Zoho
    
    Args:
        code: Authorization code from Zoho
        state: State parameter containing organization_id
        location: Zoho data center location
        accounts_server: Accounts server domain
        db: MongoDB database instance
    """
    settings = get_settings()
    
    try:
        # Extract organization_id from state
        organization_id = "default_org"  # Default for single-tenant
        if state and state.startswith("org_"):
            organization_id = state.replace("org_", "")
        
        logger.info(f"Processing OAuth callback for organization: {organization_id}")
        
        # Exchange authorization code for tokens
        token_endpoint = f"{settings.zoho_api_domain}/oauth/v2/token"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "client_id": settings.zoho_client_id,
                    "client_secret": settings.zoho_client_secret,
                    "redirect_uri": settings.zoho_redirect_uri,
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
        expires_in = token_data.get("expires_in", 3600)
        api_domain = token_data.get("api_domain", settings.zoho_api_domain)
        
        # Fetch Zoho organization details
        logger.info("Fetching Zoho Books organizations...")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{api_domain}/books/v3/organizations",
                headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as org_response:
                if org_response.status == 200:
                    org_data = await org_response.json()
                    organizations = org_data.get("organizations", [])
                    
                    if organizations:
                        # Use first organization (in production, let user choose)
                        first_org = organizations[0]
                        zoho_org_id = first_org.get("organization_id")
                        zoho_org_name = first_org.get("name")
                        zoho_email = first_org.get("email", "")
                    else:
                        raise HTTPException(
                            status_code=404,
                            detail="No Zoho Books organizations found"
                        )
                else:
                    error_text = await org_response.text()
                    logger.error(f"Failed to fetch organizations: {error_text}")
                    raise HTTPException(
                        status_code=400,
                        detail="Failed to fetch Zoho Books organizations"
                    )
        
        # Save connection to database
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Check if connection already exists for this organization
        existing_connection = await db.zoho_connections.find_one({
            "organization_id": organization_id
        })
        
        if existing_connection:
            # Update existing connection
            await db.zoho_connections.update_one(
                {"organization_id": organization_id},
                {
                    "$set": {
                        "access_token": access_token,
                        "refresh_token": refresh_token,
                        "token_expires_at": token_expires_at,
                        "zoho_organization_id": zoho_org_id,
                        "zoho_organization_name": zoho_org_name,
                        "zoho_email": zoho_email,
                        "updated_at": datetime.utcnow(),
                        "is_active": True
                    }
                }
            )
            logger.info(f"Updated Zoho connection for organization {organization_id}")
            connection_id = str(existing_connection["_id"])
        else:
            # Create new connection
            zoho_connection = {
                "organization_id": organization_id,
                "user_id": "system",  # In production, use actual user ID
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": token_expires_at,
                "zoho_organization_id": zoho_org_id,
                "zoho_organization_name": zoho_org_name,
                "zoho_email": zoho_email,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            
            result = await db.zoho_connections.insert_one(zoho_connection)
            logger.info(f"Created Zoho connection for organization {organization_id}")
            connection_id = str(result.inserted_id)
        
        return {
            "status": "success",
            "message": "Zoho Books account connected successfully",
            "connection_id": connection_id,
            "zoho_organization": {
                "id": zoho_org_id,
                "name": zoho_org_name,
                "email": zoho_email
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
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
    Check if organization has an active Zoho Books connection
    
    Args:
        organization_id: The startup organization ID
    """
    connection = await db.zoho_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        return {
            "connected": False,
            "message": "No active Zoho Books connection"
        }
    
    return {
        "connected": True,
        "zoho_organization": {
            "id": connection.get("zoho_organization_id"),
            "name": connection.get("zoho_organization_name"),
            "email": connection.get("zoho_email")
        },
        "last_updated": connection.get("updated_at")
    }


@router.delete("/disconnect")
async def disconnect_zoho(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Disconnect Zoho Books integration for an organization
    
    Args:
        organization_id: The startup organization ID
    """
    result = await db.zoho_connections.update_one(
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
            detail="No Zoho Books connection found for this organization"
        )
    
    return {
        "status": "success",
        "message": "Zoho Books disconnected successfully"
    }
