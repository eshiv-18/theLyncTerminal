"""
Models for Alerts, Reports, and Activity Feed
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============ Alert Models ============

class Alert(BaseModel):
    """Alert/notification for portfolio companies"""
    id: str
    startup_id: str
    startup_name: str
    type: str  # runway, burn_rate, growth, metric_change, report_due
    severity: str  # critical, warning, info
    title: str
    message: str
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None
    is_read: bool = False
    created_at: datetime
    action_required: bool = False


class AlertsResponse(BaseModel):
    """Response with list of alerts"""
    alerts: List[Alert]
    total_count: int
    unread_count: int
    critical_count: int


class MarkAlertRead(BaseModel):
    """Mark alert as read"""
    alert_id: str


# ============ Report Models ============

class ReportSection(BaseModel):
    """Section within a report"""
    title: str
    content: str
    metrics: Dict[str, Any] = {}


class Report(BaseModel):
    """Monthly/Quarterly report"""
    id: str
    startup_id: str
    startup_name: str
    report_type: str  # monthly, quarterly, board
    period: str  # e.g., "2024-Q1" or "2024-03"
    status: str  # draft, submitted, approved
    summary_metrics: Optional[Dict[str, Any]] = {}  # Key metrics for quick view
    sections: List[ReportSection] = []
    created_at: datetime
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_by: str
    submitted_by: Optional[str] = None


class ReportCreate(BaseModel):
    """Create new report"""
    startup_id: str
    report_type: str
    period: str
    sections: List[ReportSection] = []


class ReportsResponse(BaseModel):
    """Response with list of reports"""
    reports: List[Report]
    total_count: int
    drafts_count: int
    submitted_count: int


class ReportUpdate(BaseModel):
    """Update report"""
    status: Optional[str] = None
    sections: Optional[List[ReportSection]] = None
    submitted_by: Optional[str] = None


# ============ Activity Feed Models ============

class Activity(BaseModel):
    """Activity/event in the feed"""
    id: str
    type: str  # report_submitted, metric_updated, integration_connected, alert_created, company_added
    actor: str  # User who performed the action
    actor_role: str  # admin, investor, founder
    startup_id: Optional[str] = None
    startup_name: Optional[str] = None
    title: str
    description: str
    metadata: Dict[str, Any] = {}
    created_at: datetime


class FeedResponse(BaseModel):
    """Response with activity feed"""
    activities: List[Activity]
    total_count: int
    page: int = 1
    page_size: int = 20
