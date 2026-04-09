from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class HubSpotConnection(BaseModel):
    """Model for storing HubSpot OAuth connection details"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str  # The startup organization
    user_id: str  # Which user authorized this connection
    
    # OAuth tokens
    access_token: str
    refresh_token: str
    token_expires_at: datetime
    
    # HubSpot account details
    hub_id: str  # HubSpot portal/hub ID
    hub_domain: Optional[str] = None
    user_email: str
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HubSpotContact(BaseModel):
    """Model for HubSpot contact"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    hub_id: str
    
    contact_id: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    
    # Custom properties as dict
    properties: dict = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HubSpotCompany(BaseModel):
    """Model for HubSpot company"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    hub_id: str
    
    company_id: str
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Metrics
    number_of_employees: Optional[int] = None
    annual_revenue: Optional[float] = None
    
    # Custom properties
    properties: dict = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HubSpotDeal(BaseModel):
    """Model for HubSpot deal"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    hub_id: str
    
    deal_id: str
    deal_name: str
    amount: float = 0.0
    close_date: Optional[datetime] = None
    
    # Pipeline info
    pipeline: Optional[str] = None
    deal_stage: Optional[str] = None
    
    # Associations
    associated_company_ids: List[str] = []
    associated_contact_ids: List[str] = []
    
    # Status
    is_closed_won: bool = False
    is_closed_lost: bool = False
    
    # Custom properties
    properties: dict = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HubSpotMetrics(BaseModel):
    """Model for aggregated HubSpot CRM metrics"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    hub_id: str
    
    # Contact metrics
    total_contacts: int = 0
    new_contacts_this_month: int = 0
    
    # Company metrics
    total_companies: int = 0
    new_companies_this_month: int = 0
    
    # Deal metrics
    total_deals: int = 0
    open_deals: int = 0
    closed_won_deals: int = 0
    closed_lost_deals: int = 0
    
    # Revenue metrics
    pipeline_value: float = 0.0  # Total value of open deals
    closed_won_revenue: float = 0.0  # Total revenue from won deals
    monthly_recurring_revenue: float = 0.0  # MRR from subscription deals
    annual_recurring_revenue: float = 0.0  # ARR calculated
    
    # Win rate
    win_rate: float = 0.0  # Percentage of won vs total closed deals
    
    # Pipeline stages breakdown
    deals_by_stage: dict = {}  # {stage_name: count}
    value_by_stage: dict = {}  # {stage_name: total_value}
    
    # Metadata
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
