"""
Alerts, Reports, and Activity Feed Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from models.content_models import (
    Alert, AlertsResponse, MarkAlertRead,
    Report, ReportCreate, ReportsResponse, ReportUpdate,
    Activity, FeedResponse
)
from models.user_models import TokenData
from middleware.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Content"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


# ============ ALERTS ============

@router.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    startup_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    limit: int = Query(50, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get alerts for portfolio companies
    Investors see all, Founders see only their company
    """
    query = {}
    
    # Role-based filtering
    if current_user.role == "founder":
        # Founders only see their company's alerts
        startup = await db.startups.find_one(
            {"founder_email": current_user.email},
            {"_id": 0, "id": 1}
        )
        if startup:
            query["startup_id"] = startup["id"]
        else:
            return AlertsResponse(alerts=[], total_count=0, unread_count=0, critical_count=0)
    
    # Apply filters
    if startup_id:
        query["startup_id"] = startup_id
    if severity:
        query["severity"] = severity
    if is_read is not None:
        query["is_read"] = is_read
    
    # Get alerts
    alerts_cursor = db.alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    alerts_list = await alerts_cursor.to_list(length=limit)
    
    # Calculate counts
    total_count = len(alerts_list)
    unread_count = sum(1 for a in alerts_list if not a.get("is_read", False))
    critical_count = sum(1 for a in alerts_list if a.get("severity") == "critical")
    
    # Convert to Alert models
    alerts = [Alert(**alert) for alert in alerts_list]
    
    return AlertsResponse(
        alerts=alerts,
        total_count=total_count,
        unread_count=unread_count,
        critical_count=critical_count
    )


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Mark alert as read"""
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    
    return {"message": "Alert marked as read", "alert_id": alert_id}


@router.post("/alerts/read-all")
async def mark_all_alerts_read(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Mark all alerts as read"""
    query = {}
    
    # Founders only mark their company's alerts
    if current_user.role == "founder":
        startup = await db.startups.find_one(
            {"founder_email": current_user.email},
            {"_id": 0, "id": 1}
        )
        if startup:
            query["startup_id"] = startup["id"]
    
    result = await db.alerts.update_many(
        query,
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
    )
    
    return {
        "message": f"Marked {result.modified_count} alerts as read",
        "count": result.modified_count
    }


# ============ REPORTS ============

@router.get("/reports", response_model=ReportsResponse)
async def get_reports(
    startup_id: Optional[str] = Query(None),
    report_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get reports
    Investors/Admins see all, Founders see only their company
    """
    query = {}
    
    # Role-based filtering
    if current_user.role == "founder":
        startup = await db.startups.find_one(
            {"founder_email": current_user.email},
            {"_id": 0, "id": 1}
        )
        if startup:
            query["startup_id"] = startup["id"]
        else:
            return ReportsResponse(reports=[], total_count=0, drafts_count=0, submitted_count=0)
    
    # Apply filters
    if startup_id:
        query["startup_id"] = startup_id
    if report_type:
        query["report_type"] = report_type
    if status:
        query["status"] = status
    
    # Get reports
    reports_cursor = db.reports.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    reports_list = await reports_cursor.to_list(length=limit)
    
    # Calculate counts
    total_count = len(reports_list)
    drafts_count = sum(1 for r in reports_list if r.get("status") == "draft")
    submitted_count = sum(1 for r in reports_list if r.get("status") == "submitted")
    
    # Convert to Report models
    reports = [Report(**report) for report in reports_list]
    
    return ReportsResponse(
        reports=reports,
        total_count=total_count,
        drafts_count=drafts_count,
        submitted_count=submitted_count
    )


@router.post("/reports", response_model=Report, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Create new report (draft)"""
    # Verify startup exists
    startup = await db.startups.find_one({"id": report_data.startup_id}, {"_id": 0})
    if not startup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup not found")
    
    # Create report
    report = {
        "id": str(uuid4()),
        "startup_id": report_data.startup_id,
        "startup_name": startup["name"],
        "report_type": report_data.report_type,
        "period": report_data.period,
        "status": "draft",
        "sections": [s.dict() for s in report_data.sections],
        "created_at": datetime.now(timezone.utc),
        "submitted_at": None,
        "approved_at": None,
        "created_by": current_user.email,
        "submitted_by": None
    }
    
    await db.reports.insert_one(report)
    
    logger.info(f"Report created: {report['id']} for startup {report_data.startup_id}")
    
    return Report(**report)


@router.put("/reports/{report_id}", response_model=Report)
async def update_report(
    report_id: str,
    update_data: ReportUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Update report (submit, approve, or edit content)"""
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Build update document
    update_doc = {}
    if update_data.status:
        update_doc["status"] = update_data.status
        if update_data.status == "submitted":
            update_doc["submitted_at"] = datetime.now(timezone.utc)
            update_doc["submitted_by"] = current_user.email
        elif update_data.status == "approved":
            update_doc["approved_at"] = datetime.now(timezone.utc)
    
    if update_data.sections:
        update_doc["sections"] = [s.dict() for s in update_data.sections]
    
    if update_doc:
        await db.reports.update_one({"id": report_id}, {"$set": update_doc})
    
    # Get updated report
    updated_report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    
    logger.info(f"Report updated: {report_id} by {current_user.email}")
    
    return Report(**updated_report)


@router.get("/reports/{report_id}", response_model=Report)
async def get_report(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get single report by ID"""
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    return Report(**report)


# ============ ACTIVITY FEED ============

@router.get("/feed", response_model=FeedResponse)
async def get_activity_feed(
    startup_id: Optional[str] = Query(None),
    activity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get activity feed
    Shows recent activities across portfolio
    """
    query = {}
    
    # Role-based filtering
    if current_user.role == "founder":
        startup = await db.startups.find_one(
            {"founder_email": current_user.email},
            {"_id": 0, "id": 1}
        )
        if startup:
            query["startup_id"] = startup["id"]
        else:
            return FeedResponse(activities=[], total_count=0, page=page, page_size=page_size)
    
    # Apply filters
    if startup_id:
        query["startup_id"] = startup_id
    if activity_type:
        query["type"] = activity_type
    
    # Get total count
    total_count = await db.activities.count_documents(query)
    
    # Get paginated activities
    skip = (page - 1) * page_size
    activities_cursor = db.activities.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size)
    activities_list = await activities_cursor.to_list(length=page_size)
    
    # Convert to Activity models
    activities = [Activity(**activity) for activity in activities_list]
    
    return FeedResponse(
        activities=activities,
        total_count=total_count,
        page=page,
        page_size=page_size
    )


@router.post("/feed/activity", status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_type: str,
    title: str,
    description: str,
    startup_id: Optional[str] = None,
    metadata: dict = {},
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Create activity log entry"""
    startup_name = None
    if startup_id:
        startup = await db.startups.find_one({"id": startup_id}, {"_id": 0, "name": 1})
        if startup:
            startup_name = startup["name"]
    
    activity = {
        "id": str(uuid4()),
        "type": activity_type,
        "actor": current_user.email,
        "actor_role": current_user.role,
        "startup_id": startup_id,
        "startup_name": startup_name,
        "title": title,
        "description": description,
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.activities.insert_one(activity)
    
    logger.info(f"Activity created: {activity_type} by {current_user.email}")
    
    return {"message": "Activity logged", "activity_id": activity["id"]}
