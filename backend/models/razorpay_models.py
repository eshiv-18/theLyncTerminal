from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class RazorpayCredentials(BaseModel):
    """Model for storing Razorpay API credentials"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str  # The startup organization
    
    # API credentials (encrypted in production)
    key_id: str  # rzp_test_xxx or rzp_live_xxx
    key_secret: str  # Should be encrypted
    webhook_secret: Optional[str] = None  # For webhook signature verification
    
    # Mode
    is_live_mode: bool = False  # Test vs Live
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RazorpayPayment(BaseModel):
    """Model for Razorpay payment"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    
    payment_id: str
    order_id: Optional[str] = None
    invoice_id: Optional[str] = None
    
    amount: float  # In currency units (e.g., 1000.00 for ₹1000)
    currency: str = "INR"
    status: str  # captured, authorized, failed, refunded
    method: str  # card, netbanking, wallet, upi, etc.
    
    # Customer info
    email: Optional[str] = None
    contact: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    captured_at: Optional[datetime] = None
    
    # Metadata
    notes: dict = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RazorpaySubscription(BaseModel):
    """Model for Razorpay subscription"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    
    subscription_id: str
    plan_id: str
    customer_id: str
    
    status: str  # created, authenticated, active, paused, cancelled, completed
    
    # Billing
    quantity: int = 1
    total_count: int  # Total billing cycles
    paid_count: int = 0  # Completed billing cycles
    remaining_count: int = 0
    
    # Amounts
    plan_amount: float
    customer_amount: Optional[float] = None
    
    # Dates
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    charge_at: Optional[datetime] = None
    current_start: Optional[datetime] = None
    current_end: Optional[datetime] = None
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    notes: dict = {}
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RazorpayCustomer(BaseModel):
    """Model for Razorpay customer"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    
    customer_id: str
    name: Optional[str] = None
    email: str
    contact: Optional[str] = None
    
    # Metadata
    gstin: Optional[str] = None  # GST number for Indian customers
    notes: dict = {}
    
    created_at: datetime
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RazorpayMetrics(BaseModel):
    """Model for aggregated Razorpay payment metrics"""
    id: Optional[str] = Field(None, alias="_id")
    organization_id: str
    
    # Payment metrics
    total_payments: int = 0
    successful_payments: int = 0
    failed_payments: int = 0
    
    # Revenue metrics
    revenue_mtd: float = 0.0  # Month to date
    revenue_qtd: float = 0.0  # Quarter to date
    revenue_ytd: float = 0.0  # Year to date
    
    # Subscription metrics
    active_subscriptions: int = 0
    total_subscriptions: int = 0
    cancelled_subscriptions: int = 0
    
    # MRR/ARR
    mrr: float = 0.0  # Monthly Recurring Revenue
    arr: float = 0.0  # Annual Recurring Revenue
    
    # Churn
    churn_rate: float = 0.0  # Monthly churn percentage
    churned_mrr: float = 0.0
    
    # Customer metrics
    total_customers: int = 0
    new_customers_this_month: int = 0
    
    # Average metrics
    average_transaction_value: float = 0.0
    
    # Payment methods breakdown
    payment_methods: dict = {}  # {method: count}
    
    # Metadata
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
