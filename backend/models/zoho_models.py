from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ZohoConnection(BaseModel):
    """Model for storing Zoho Books OAuth connection details"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str  # The startup organization this connection belongs to
    user_id: str  # Which user authorized this connection
    
    # OAuth tokens
    access_token: str
    refresh_token: str
    token_expires_at: datetime
    
    # Zoho Books organization details
    zoho_organization_id: str  # Zoho Books organization ID
    zoho_organization_name: Optional[str] = None
    zoho_email: str  # Email associated with Zoho account
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AccountBalance(BaseModel):
    """Model for individual account balance"""
    account_id: str
    account_name: str
    account_type: str
    balance: float
    currency_code: str = "USD"


class FinancialMetrics(BaseModel):
    """Model for aggregated financial data from Zoho Books"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str  # The startup organization
    zoho_organization_id: str  # Zoho Books organization ID
    
    # Cash and liquidity
    cash_balance: float = 0.0
    accounts_receivable: float = 0.0
    accounts_payable: float = 0.0
    
    # Revenue metrics
    total_revenue_month: float = 0.0
    total_revenue_quarter: float = 0.0
    total_revenue_year: float = 0.0
    
    # Expense metrics
    total_expenses_month: float = 0.0
    total_expenses_quarter: float = 0.0
    total_expenses_year: float = 0.0
    
    # Calculated metrics
    burn_rate_monthly: float = 0.0
    net_burn_rate_monthly: float = 0.0
    runway_months: Optional[float] = None
    
    # Account details
    account_balances: list[AccountBalance] = []
    
    # Metadata
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
