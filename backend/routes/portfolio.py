from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from uuid import uuid4
from datetime import datetime, timezone
from models.startup_models import (
    Startup, StartupCreate, StartupUpdate, StartupResponse,
    PortfolioOverview, HealthStatus, AlertSeverity
)
from models.user_models import User, UserRole
from middleware.auth import get_current_user, require_role
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


@router.get("/overview", response_model=PortfolioOverview)
async def get_portfolio_overview(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get portfolio overview dashboard data
    
    - Investors see all startups in their portfolio
    - Founders see their own startup
    - Admins see everything
    """
    # Build query based on role
    if current_user.role == UserRole.FOUNDER:
        query = {"founder_user_id": current_user.id}
    elif current_user.role == UserRole.INVESTOR:
        query = {"investor_ids": current_user.id}
    else:  # Admin
        query = {}
    
    # Get all startups
    startups = await db.startups.find(query, {"_id": 0}).to_list(1000)
    
    if not startups:
        # Return empty overview if no startups
        return PortfolioOverview(
            total_startups=0,
            total_deployed=0.0,
            total_valuation=0.0,
            active_startups=0,
            healthy_count=0,
            warning_count=0,
            critical_count=0,
            total_alerts=0,
            critical_alerts=0,
            pending_reports=0,
            overdue_reports=0,
            top_performers=[],
            recent_activity=[]
        )
    
    # Calculate metrics
    total_deployed = sum(s.get("funding_amount", 0) or 0 for s in startups)
    total_valuation = sum(s.get("valuation", 0) or 0 for s in startups)
    
    # Health breakdown
    healthy_count = sum(1 for s in startups if s.get("health_status") == HealthStatus.HEALTHY.value)
    warning_count = sum(1 for s in startups if s.get("health_status") == HealthStatus.WARNING.value)
    critical_count = sum(1 for s in startups if s.get("health_status") == HealthStatus.CRITICAL.value)
    
    # Get alerts
    alert_query = {"startup_id": {"$in": [s["id"] for s in startups]}, "dismissed": False}
    alerts = await db.alerts.find(alert_query, {"_id": 0}).to_list(1000)
    
    total_alerts = len(alerts)
    critical_alerts = sum(1 for a in alerts if a.get("severity") == AlertSeverity.CRITICAL.value)
    
    # Top performers (by health score)
    top_performers = sorted(
        [
            {
                "id": s["id"],
                "name": s["name"],
                "health_score": s.get("health_score", 0),
                "mrr": s.get("metrics", {}).get("mrr", 0)
            }
            for s in startups
        ],
        key=lambda x: x["health_score"],
        reverse=True
    )[:5]
    
    # Recent activity (mock for now - would come from activity log)
    recent_activity = []
    
    # Reports (mock for now)
    pending_reports = 0
    overdue_reports = 0
    
    return PortfolioOverview(
        total_startups=len(startups),
        total_deployed=total_deployed,
        total_valuation=total_valuation,
        active_startups=len(startups),
        healthy_count=healthy_count,
        warning_count=warning_count,
        critical_count=critical_count,
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        pending_reports=pending_reports,
        overdue_reports=overdue_reports,
        top_performers=top_performers,
        recent_activity=recent_activity
    )


@router.get("/startups", response_model=List[StartupResponse])
async def get_startups(
    stage: Optional[str] = None,
    health_status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of startups with optional filters
    """
    # Build query based on role
    if current_user.role == UserRole.FOUNDER:
        query = {"founder_user_id": current_user.id}
    elif current_user.role == UserRole.INVESTOR:
        query = {"investor_ids": current_user.id}
    else:  # Admin
        query = {}
    
    # Add filters
    if stage:
        query["stage"] = stage
    if health_status:
        query["health_status"] = health_status
    
    startups = await db.startups.find(query, {"_id": 0}).to_list(1000)
    
    return [StartupResponse(**s) for s in startups]


@router.post("/startups", response_model=StartupResponse, status_code=status.HTTP_201_CREATED)
async def create_startup(
    startup_data: StartupCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.INVESTOR))
):
    """
    Create a new startup (Admin or Investor only)
    """
    startup_dict = startup_data.model_dump()
    startup_dict.update({
        "id": str(uuid4()),
        "health_status": HealthStatus.HEALTHY.value,
        "health_score": 100,
        "investor_ids": [current_user.id] if current_user.role == UserRole.INVESTOR else [],
        "metrics": {
            "mrr": 0.0,
            "arr": 0.0,
            "revenue": 0.0,
            "burn_rate": 0.0,
            "cash_balance": 0.0,
            "runway_months": 0,
            "growth_rate": 0.0,
            "customer_count": 0,
            "churn_rate": 0.0,
            "headcount": 0,
            "last_updated": datetime.now(timezone.utc).isoformat()
        },
        "integrations": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_report_date": None,
        "next_report_due": None
    })
    
    await db.startups.insert_one(startup_dict)
    
    logger.info(f"Startup created: {startup_data.name} by {current_user.email}")
    
    startup_dict.pop("_id", None)
    return StartupResponse(**startup_dict)


@router.get("/startups/{startup_id}", response_model=StartupResponse)
async def get_startup(
    startup_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed startup information
    """
    startup = await db.startups.find_one({"id": startup_id}, {"_id": 0})
    
    if not startup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Startup not found"
        )
    
    # Check access permissions
    if current_user.role == UserRole.FOUNDER:
        if startup.get("founder_user_id") != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    elif current_user.role == UserRole.INVESTOR:
        if current_user.id not in startup.get("investor_ids", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return StartupResponse(**startup)


@router.put("/startups/{startup_id}", response_model=StartupResponse)
async def update_startup(
    startup_id: str,
    startup_data: StartupUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update startup information
    """
    # Check if startup exists and user has access
    startup = await db.startups.find_one({"id": startup_id}, {"_id": 0})
    
    if not startup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Startup not found"
        )
    
    # Check permissions
    if current_user.role == UserRole.FOUNDER:
        if startup.get("founder_user_id") != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.INVESTOR:
        if current_user.id not in startup.get("investor_ids", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Update fields
    update_data = startup_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.startups.update_one(
        {"id": startup_id},
        {"$set": update_data}
    )
    
    # Get updated startup
    updated_startup = await db.startups.find_one({"id": startup_id}, {"_id": 0})
    
    logger.info(f"Startup updated: {startup_id} by {current_user.email}")
    
    return StartupResponse(**updated_startup)
