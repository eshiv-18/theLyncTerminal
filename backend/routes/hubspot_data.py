import aiohttp
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timedelta
from config import get_settings
from services.hubspot_client import HubSpotClient
from services.hubspot_crm_service import HubSpotCRMService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hubspot", tags=["hubspot-data"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.get("/metrics")
async def get_crm_metrics(
    organization_id: str = Query(..., description="Startup organization ID"),
    refresh: bool = Query(False, description="Force refresh from HubSpot"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve current CRM metrics for an organization
    
    Args:
        organization_id: The startup organization ID
        refresh: If True, fetch fresh data from HubSpot
    
    Returns:
        CRM metrics including contacts, companies, deals, pipeline value, etc.
    """
    settings = get_settings()
    
    try:
        # Check if we should use cached data
        if not refresh:
            cached_metrics = await db.hubspot_metrics.find_one(
                {"organization_id": organization_id},
                {"_id": 0}
            )
            
            if cached_metrics:
                # Check if cache is recent (less than 30 minutes old)
                fetched_at = cached_metrics.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    logger.info(f"Returning cached HubSpot metrics for {organization_id}")
                    return cached_metrics
        
        # Get connection
        connection = await db.hubspot_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        if not connection:
            raise HTTPException(
                status_code=404,
                detail="HubSpot not connected for this organization"
            )
        
        # Get valid access token (with auto-refresh if needed)
        access_token = connection["access_token"]
        hub_id = connection["hub_id"]
        
        # Check if token is expired or about to expire
        token_expires_at = connection["token_expires_at"]
        if token_expires_at < datetime.utcnow() + timedelta(minutes=5):
            logger.info(f"Refreshing HubSpot token for organization {organization_id}")
            
            # Refresh token
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.hubapi.com/oauth/v1/token",
                    data={
                        "grant_type": "refresh_token",
                        "client_id": settings.hubspot_client_id,
                        "client_secret": settings.hubspot_client_secret,
                        "refresh_token": connection["refresh_token"]
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        raise HTTPException(
                            status_code=401,
                            detail="Failed to refresh HubSpot token"
                        )
                    
                    token_data = await response.json()
                    access_token = token_data["access_token"]
                    new_refresh_token = token_data.get("refresh_token", connection["refresh_token"])
                    expires_in = token_data.get("expires_in", 1800)
                    
                    # Update database
                    await db.hubspot_connections.update_one(
                        {"_id": connection["_id"]},
                        {
                            "$set": {
                                "access_token": access_token,
                                "refresh_token": new_refresh_token,
                                "token_expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
        
        # Create HubSpot client and fetch data
        logger.info(f"Fetching fresh HubSpot CRM data for {organization_id}")
        
        hubspot_client = HubSpotClient(access_token=access_token)
        crm_service = HubSpotCRMService(
            hubspot_client=hubspot_client,
            organization_id=organization_id,
            hub_id=hub_id
        )
        
        metrics = await crm_service.fetch_all_crm_metrics()
        
        # Store/update metrics in database
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)
        
        await db.hubspot_metrics.update_one(
            {
                "organization_id": organization_id,
                "hub_id": hub_id
            },
            {"$set": metrics_dict},
            upsert=True
        )
        
        logger.info(f"HubSpot CRM metrics updated for {organization_id}")
        return metrics_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching HubSpot CRM metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch HubSpot CRM metrics: {str(e)}"
        )


@router.get("/contacts")
async def get_contacts(
    organization_id: str = Query(..., description="Startup organization ID"),
    limit: int = Query(100, ge=1, le=100, description="Results per page"),
    after: Optional[str] = Query(None, description="Pagination cursor"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve contacts from HubSpot"""
    connection = await db.hubspot_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="HubSpot not connected"
        )
    
    try:
        client = HubSpotClient(access_token=connection["access_token"])
        contacts_data = await client.get_contacts(limit=limit, after=after)
        
        return {
            "contacts": contacts_data.get("results", []),
            "paging": contacts_data.get("paging", {}),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching contacts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch contacts: {str(e)}"
        )


@router.get("/companies")
async def get_companies(
    organization_id: str = Query(..., description="Startup organization ID"),
    limit: int = Query(100, ge=1, le=100, description="Results per page"),
    after: Optional[str] = Query(None, description="Pagination cursor"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve companies from HubSpot"""
    connection = await db.hubspot_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="HubSpot not connected"
        )
    
    try:
        client = HubSpotClient(access_token=connection["access_token"])
        companies_data = await client.get_companies(limit=limit, after=after)
        
        return {
            "companies": companies_data.get("results", []),
            "paging": companies_data.get("paging", {}),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching companies: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch companies: {str(e)}"
        )


@router.get("/deals")
async def get_deals(
    organization_id: str = Query(..., description="Startup organization ID"),
    limit: int = Query(100, ge=1, le=100, description="Results per page"),
    after: Optional[str] = Query(None, description="Pagination cursor"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve deals from HubSpot"""
    connection = await db.hubspot_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        raise HTTPException(
            status_code=404,
            detail="HubSpot not connected"
        )
    
    try:
        client = HubSpotClient(access_token=connection["access_token"])
        deals_data = await client.get_deals(limit=limit, after=after)
        
        return {
            "deals": deals_data.get("results", []),
            "paging": deals_data.get("paging", {}),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching deals: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch deals: {str(e)}"
        )


@router.get("/deals/revenue")
async def get_revenue_metrics(
    organization_id: str = Query(..., description="Startup organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get revenue-specific metrics from HubSpot deals"""
    metrics = await db.hubspot_metrics.find_one(
        {"organization_id": organization_id},
        {"_id": 0}
    )
    
    if not metrics:
        # Try to fetch if not cached
        return await get_crm_metrics(organization_id=organization_id, refresh=True, db=db)
    
    return {
        "organization_id": organization_id,
        "pipeline_value": metrics.get("pipeline_value", 0.0),
        "closed_won_revenue": metrics.get("closed_won_revenue", 0.0),
        "monthly_recurring_revenue": metrics.get("monthly_recurring_revenue", 0.0),
        "annual_recurring_revenue": metrics.get("annual_recurring_revenue", 0.0),
        "win_rate": metrics.get("win_rate", 0.0),
        "open_deals": metrics.get("open_deals", 0),
        "closed_won_deals": metrics.get("closed_won_deals", 0)
    }


@router.post("/sync")
async def sync_crm_data(
    organization_id: str = Query(..., description="Startup organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Manually trigger CRM data sync"""
    try:
        # This will force a refresh
        metrics = await get_crm_metrics(
            organization_id=organization_id,
            refresh=True,
            db=db
        )
        
        return {
            "status": "success",
            "message": "CRM data synced successfully",
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Error syncing CRM data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync CRM data: {str(e)}"
        )
