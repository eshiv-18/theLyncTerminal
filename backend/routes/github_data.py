from fastapi import APIRouter, HTTPException, Request, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
from config import get_settings
from services.github_client import GitHubClient
from services.github_metrics_service import GitHubMetricsService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/github", tags=["github-data"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


@router.get("/metrics")
async def get_code_metrics(
    organization_id: str = Query(...),
    refresh: bool = Query(False),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get aggregated code metrics for an organization"""
    try:
        if not refresh:
            cached_metrics = await db.github_metrics.find_one(
                {"organization_id": organization_id},
                {"_id": 0}
            )
            
            if cached_metrics:
                fetched_at = cached_metrics.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    logger.info(f"Returning cached GitHub metrics for {organization_id}")
                    return cached_metrics
        
        connection = await db.github_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        if not connection:
            raise HTTPException(404, "GitHub not connected")
        
        logger.info(f"Fetching fresh GitHub metrics for {organization_id}")
        
        client = GitHubClient(access_token=connection["access_token"])
        metrics_service = GitHubMetricsService(
            github_client=client,
            organization_id=organization_id,
            github_user_id=connection["github_user_id"]
        )
        
        metrics = await metrics_service.fetch_all_code_metrics()
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)
        
        await db.github_metrics.update_one(
            {"organization_id": organization_id},
            {"$set": metrics_dict},
            upsert=True
        )
        
        logger.info(f"GitHub metrics updated for {organization_id}")
        return metrics_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching GitHub metrics: {str(e)}")
        raise HTTPException(500, f"Failed to fetch metrics: {str(e)}")


@router.get("/repositories")
async def get_repositories(
    organization_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get list of repositories"""
    connection = await db.github_connections.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not connection:
        raise HTTPException(404, "GitHub not connected")
    
    try:
        client = GitHubClient(access_token=connection["access_token"])
        repos = await client.get_all_repositories(max_repos=50)
        
        return {
            "repositories": repos,
            "count": len(repos),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching repositories: {str(e)}")
        raise HTTPException(500, f"Failed to fetch repositories: {str(e)}")


@router.post("/sync")
async def sync_code_data(
    organization_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Manually trigger code data sync"""
    try:
        metrics = await get_code_metrics(
            organization_id=organization_id,
            refresh=True,
            db=db
        )
        
        return {
            "status": "success",
            "message": "Code data synced successfully",
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Error syncing code data: {str(e)}")
        raise HTTPException(500, f"Failed to sync: {str(e)}")
