from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


class StartupStage(str, Enum):
    """Startup funding stages"""
    PRE_SEED = "pre-seed"
    SEED = "seed"
    SERIES_A = "series-a"
    SERIES_B = "series-b"
    SERIES_C = "series-c"
    SERIES_D_PLUS = "series-d+"
    GROWTH = "growth"


class HealthStatus(str, Enum):
    """Overall health status"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Metrics(BaseModel):
    """Startup metrics"""
    model_config = ConfigDict(extra="ignore")
    
    # Financial metrics
    mrr: Optional[float] = 0.0
    arr: Optional[float] = 0.0
    revenue: Optional[float] = 0.0
    burn_rate: Optional[float] = 0.0
    cash_balance: Optional[float] = 0.0
    runway_months: Optional[int] = 0
    
    # Growth metrics
    growth_rate: Optional[float] = 0.0
    customer_count: Optional[int] = 0
    churn_rate: Optional[float] = 0.0
    
    # Team metrics
    headcount: Optional[int] = 0
    
    # Operational
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Alert(BaseModel):
    """Startup alert"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    startup_id: str
    severity: AlertSeverity
    title: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_read: bool = False
    dismissed: bool = False


class Integration(BaseModel):
    """Integration connection status"""
    model_config = ConfigDict(extra="ignore")
    
    name: str  # zoho, hubspot, razorpay, github
    connected: bool = False
    last_sync: Optional[datetime] = None


class Startup(BaseModel):
    """Startup/Portfolio company model"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    name: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    
    # Funding info
    stage: StartupStage
    funding_amount: Optional[float] = None
    valuation: Optional[float] = None
    investment_date: Optional[datetime] = None
    
    # Status
    health_status: HealthStatus = HealthStatus.HEALTHY
    health_score: int = 100
    
    # Founder info
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    founder_user_id: Optional[str] = None
    
    # Investor info
    investor_ids: List[str] = []
    
    # Metrics
    metrics: Metrics = Field(default_factory=Metrics)
    
    # Integrations
    integrations: List[Integration] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_report_date: Optional[datetime] = None
    next_report_due: Optional[datetime] = None


class StartupCreate(BaseModel):
    """Schema for creating a startup"""
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    stage: StartupStage
    funding_amount: Optional[float] = None
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None


class StartupUpdate(BaseModel):
    """Schema for updating a startup"""
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    stage: Optional[StartupStage] = None
    health_status: Optional[HealthStatus] = None
    health_score: Optional[int] = None
    metrics: Optional[Metrics] = None


class PortfolioOverview(BaseModel):
    """Portfolio dashboard overview"""
    model_config = ConfigDict(extra="ignore")
    
    total_startups: int
    total_deployed: float
    total_valuation: float
    active_startups: int
    
    # Health breakdown
    healthy_count: int
    warning_count: int
    critical_count: int
    
    # Alerts
    total_alerts: int
    critical_alerts: int
    
    # Reports
    pending_reports: int
    overdue_reports: int
    
    # Top performers
    top_performers: List[Dict[str, Any]] = []
    
    # Recent activity
    recent_activity: List[Dict[str, Any]] = []


class StartupResponse(BaseModel):
    """Public startup data response"""
    id: str
    name: str
    logo_url: Optional[str]
    description: Optional[str]
    website: Optional[str]
    stage: str
    funding_amount: Optional[float]
    valuation: Optional[float]
    health_status: str
    health_score: int
    founder_name: Optional[str]
    metrics: Metrics
    integrations: List[Integration]
    created_at: datetime
    last_report_date: Optional[datetime]
    next_report_due: Optional[datetime]
