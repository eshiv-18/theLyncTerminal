"""
Workspace and Organization Models
Handles fund/workspace setup, team management, and settings
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============ Workspace Models ============

class WorkspaceCreate(BaseModel):
    """Admin creates workspace during onboarding"""
    # Step 1: Welcome
    org_name: str = Field(..., min_length=2, max_length=200)
    user_name: str = Field(default='', max_length=100)
    email: EmailStr
    country: str = Field(default='')
    use_case: str = Field(default='')  # vc_fund, accelerator, family_office, angel_network
    
    # Step 2: Workspace Settings
    fund_name: str = Field(default='')
    logo_url: Optional[str] = None
    currency: str = "USD"
    reporting_frequency: str = "monthly"  # monthly, quarterly
    timezone: str = "UTC"
    portfolio_unit: str = "fund"  # fund, spv, other
    investment_stages: List[str] = []
    sectors: List[str] = []
    
    # Step 6: Metrics & Rules
    health_score_template: str = "balanced"  # balanced, growth-focused, efficiency-focused
    runway_threshold: int = 9
    required_sections: List[str] = ["financial", "gtm", "product"]
    mandatory_metrics: bool = True
    alert_recipients: List[str] = ["admin", "partners"]
    founder_can_edit: bool = True


class WorkspaceResponse(BaseModel):
    """Workspace details returned to frontend"""
    id: str
    org_name: str
    fund_name: str
    logo_url: Optional[str] = None
    currency: str
    reporting_frequency: str
    timezone: str
    portfolio_unit: str
    investment_stages: List[str]
    sectors: List[str]
    health_score_template: str
    runway_threshold: int
    required_sections: List[str]
    founder_can_edit: bool
    created_at: datetime
    created_by: str  # Admin user ID


class WorkspaceUpdate(BaseModel):
    """Update workspace settings"""
    fund_name: Optional[str] = None
    logo_url: Optional[str] = None
    currency: Optional[str] = None
    reporting_frequency: Optional[str] = None
    timezone: Optional[str] = None
    investment_stages: Optional[List[str]] = None
    sectors: Optional[List[str]] = None
    health_score_template: Optional[str] = None
    runway_threshold: Optional[int] = None
    required_sections: Optional[List[str]] = None
    founder_can_edit: Optional[bool] = None


# ============ Team Invitation Models ============

class TeamMemberInvite(BaseModel):
    """Invite team member (Partner, Analyst, Associate)"""
    email: EmailStr
    name: str
    role: str  # admin, investor, analyst
    permissions: Dict[str, bool] = {
        "view_portfolio": True,
        "edit_companies": False,
        "invite_team": False,
        "manage_settings": False
    }


class BulkTeamInvite(BaseModel):
    """Invite multiple team members at once"""
    workspace_id: str
    members: List[TeamMemberInvite]
    custom_message: Optional[str] = None


class TeamInviteResponse(BaseModel):
    """Response after sending team invitations"""
    workspace_id: str
    invited_count: int
    invited_emails: List[str]
    invitation_ids: List[str]
    message: str


# ============ Founder Invitation Models ============

class FounderInvite(BaseModel):
    """Invite founder to setup their company workspace"""
    startup_id: str
    founder_email: EmailStr
    founder_name: str
    custom_message: Optional[str] = None
    reporting_cadence: str = "monthly"
    report_due_date: int = 5  # Day of month
    

class BulkFounderInvite(BaseModel):
    """Invite multiple founders at once"""
    workspace_id: str
    invitations: List[FounderInvite]


class FounderInviteResponse(BaseModel):
    """Response after sending founder invitations"""
    workspace_id: str
    invited_count: int
    invited_startups: List[str]
    invitation_ids: List[str]
    message: str


# ============ Bulk Company Import Models ============

class CompanyImportItem(BaseModel):
    """Single company for bulk import"""
    name: str
    stage: str  # seed, series_a, series_b, etc.
    sector: Optional[str] = None
    website: Optional[str] = None
    founder_name: str
    founder_email: EmailStr
    funding_amount: Optional[float] = None
    valuation: Optional[float] = None
    investment_date: Optional[str] = None


class BulkCompanyImport(BaseModel):
    """Bulk import companies from CSV or form"""
    workspace_id: str
    companies: List[CompanyImportItem]
    send_founder_invites: bool = False


class CompanyImportResponse(BaseModel):
    """Response after bulk company import"""
    workspace_id: str
    imported_count: int
    failed_count: int
    company_ids: List[str]
    failed_companies: List[Dict[str, str]] = []
    invitations_sent: int = 0
    message: str


# ============ Founder Onboarding Models ============

class FounderOnboardingData(BaseModel):
    """Data collected during founder onboarding (10 steps)"""
    # Step 1: Accept Invitation
    invitation_token: str
    accepted: bool = True
    
    # Step 2: Trust & Consent
    understood_data_sharing: bool
    reviewed_visibility: bool
    
    # Step 3: Company Details (pre-filled from admin)
    website: Optional[str] = None
    sector: Optional[str] = None
    stage: Optional[str] = None
    business_model: Optional[str] = None
    hq: Optional[str] = None
    founders: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    reporting_owner: Optional[str] = None
    finance_owner: Optional[str] = None
    
    # Step 4: Team Invites
    team_members: List[Dict[str, str]] = []
    
    # Step 5: Data Sources (integration IDs)
    connected_sources: List[str] = []
    
    # Step 6: Metric Mappings
    metric_mappings: List[Dict[str, Any]] = []
    
    # Step 7: Sharing Preferences
    sharing_preferences: Dict[str, Dict[str, bool]] = {}
    
    # Step 9: Reporting Settings
    report_due_date: int = 5
    reminder_schedule: str = "3_days"
    default_recipients: List[str] = []
    board_report_freq: str = "quarterly"
    auto_generate_drafts: bool = True


class FounderOnboardingComplete(BaseModel):
    """Response after founder completes onboarding"""
    startup_id: str
    workspace_id: str
    founder_id: str
    onboarding_completed: bool
    workspace_ready: bool
    integrations_count: int
    team_invited_count: int
    message: str


# ============ Invitation Token Models ============

class InvitationToken(BaseModel):
    """Invitation token for secure onboarding links"""
    id: str
    token: str
    type: str  # team, founder
    workspace_id: str
    email: EmailStr
    role: str
    expires_at: datetime
    used: bool = False
    created_at: datetime
