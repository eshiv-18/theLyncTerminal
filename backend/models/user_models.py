from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
from enum import Enum


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    INVESTOR = "investor"
    FOUNDER = "founder"


class User(BaseModel):
    """User model for authentication and authorization"""
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: EmailStr
    name: str
    role: UserRole
    organization_id: Optional[str] = None  # For investors/founders
    avatar_url: Optional[str] = None
    is_active: bool = True
    onboarding_completed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None


class UserInDB(User):
    """User model with password hash (for database)"""
    password_hash: str


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: EmailStr
    name: str
    password: str
    role: UserRole
    organization_id: Optional[str] = None
    avatar_url: Optional[str] = None
    onboarding_completed: bool = False


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: str
    role: str
    exp: int


class UserResponse(BaseModel):
    """Public user data response"""
    id: str
    email: str
    name: str
    role: str
    organization_id: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    onboarding_completed: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
