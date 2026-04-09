import aiohttp
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from config import get_settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/github", tags=["github-auth"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.get("/authorize")
async def initiate_oauth_flow(organization_id: str):
    """
    Initiate GitHub OAuth flow
    
    Args:
        organization_id: The startup organization ID requesting connection
    
    Returns:
        Authorization URL to redirect user to
    """
    settings = get_settings()
    
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=500,
            detail="GitHub integration not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
        )
    
    # Required scopes for repository access
    scopes = [
        "repo",  # Access to repositories
        "read:user",  # Read user profile
        "read:org"  # Read organization data
    ]
    
    # Store organization_id in state parameter
    state = f"org_{organization_id}"
    
    auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={settings.github_client_id}&"
        f"redirect_uri={settings.github_redirect_uri}&"
        f"scope={' '.join(scopes)}&"
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Handle OAuth callback from GitHub
    
    Args:
        code: Authorization code from GitHub
        state: State parameter containing organization_id
        db: MongoDB database instance
    """
    settings = get_settings()
    
    try:
        # Extract organization_id from state
        organization_id = "default_org"
        if state and state.startswith("org_"):
            organization_id = state.replace("org_", "")
        
        logger.info(f"Processing GitHub OAuth callback for organization: {organization_id}")
        
        # Exchange authorization code for access token
        token_endpoint = "https://github.com/login/oauth/access_token"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                token_endpoint,
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri
                },
                headers={"Accept": "application/json"},
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
        
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token received from GitHub"
            )
        
        token_type = token_data.get("token_type", "bearer")
        scope = token_data.get("scope", "")
        
        # Fetch GitHub user information
        logger.info("Fetching GitHub user information...")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as user_response:
                if user_response.status == 200:
                    user_data = await user_response.json()
                    github_user_id = user_data.get("id")
                    github_username = user_data.get("login")
                    github_email = user_data.get("email")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Failed to fetch GitHub user information"
                    )
        
        # Check if connection already exists
        existing_connection = await db.github_connections.find_one({
            "organization_id": organization_id
        })
        
        if existing_connection:
            # Update existing connection
            await db.github_connections.update_one(
                {"organization_id": organization_id},
                {
                    "$set": {
                        "access_token": access_token,
                        "token_type": token_type,
                        "scope": scope,
                        "github_user_id": github_user_id,
                        "github_username": github_username,
                        "github_email": github_email,
                        "updated_at": datetime.utcnow(),
                        "is_active": True
                    }
                }
            )
            logger.info(f"Updated GitHub connection for organization {organization_id}")
            connection_id = str(existing_connection["_id"])
        else:
            # Create new connection
            github_connection = {
                "organization_id": organization_id,
                "user_id": "system",
                "access_token": access_token,
                "token_type": token_type,
                "scope": scope,
                "github_user_id": github_user_id,
                "github_username": github_username,
                "github_email": github_email,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            
            result = await db.github_connections.insert_one(github_connection)
            logger.info(f"Created GitHub connection for organization {organization_id}")
            connection_id = str(result.inserted_id)
        
        return {
            "status": "success",
            "message": "GitHub account connected successfully",
            "connection_id": connection_id,
            "github_account": {
                "user_id": github_user_id,
                "username": github_username,
                "email": github_email
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth callback error: {str(e)}")
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
    Check if organization has an active GitHub connection
    
    Args:
        organization_id: The startup organization ID
    """
    connection = await db.github_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        return {
            "connected": False,
            "message": "No active GitHub connection"
        }
    
    return {
        "connected": True,
        "github_account": {
            "user_id": connection.get("github_user_id"),
            "username": connection.get("github_username"),
            "email": connection.get("github_email")
        },
        "last_updated": connection.get("updated_at")
    }


@router.delete("/disconnect")
async def disconnect_github(
    organization_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Disconnect GitHub integration for an organization
    
    Args:
        organization_id: The startup organization ID
    """
    result = await db.github_connections.update_one(
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
            detail="No GitHub connection found for this organization"
        )
    
    return {
        "status": "success",
        "message": "GitHub disconnected successfully"
    }
