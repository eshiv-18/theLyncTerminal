from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from uuid import uuid4
from models.user_models import (
    UserCreate, UserLogin, UserResponse, Token, User, UserRole
)
from pydantic import BaseModel
from utils.auth import AuthUtils
from middleware.auth import get_current_user, require_role
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RefreshTokenRequest(BaseModel):
    """Request body for token refresh"""
    refresh_token: str


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Register a new user (Public registration)
    
    Anyone can register. Admin role cannot be self-assigned.
    """
    # Prevent self-assigning admin role
    if user_data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot self-assign admin role"
        )
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = AuthUtils.hash_password(user_data.password)
    
    # Create user document
    user_dict = user_data.model_dump(exclude={"password"})
    user_dict.update({
        "id": str(uuid4()),
        "password_hash": password_hash,
        "is_active": True,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None
    })
    
    # Insert into database
    await db.users.insert_one(user_dict)
    
    logger.info(f"New user registered: {user_data.email} (role: {user_data.role})")
    
    # Return user without password_hash
    user_dict.pop("password_hash")
    return UserResponse(**user_dict)


@router.post("/admin/create-user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Create a new user (Admin only)
    
    Admins can create users with any role, including other admins
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = AuthUtils.hash_password(user_data.password)
    
    # Create user document
    user_dict = user_data.model_dump(exclude={"password"})
    user_dict.update({
        "id": str(uuid4()),
        "password_hash": password_hash,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None
    })
    
    # Insert into database
    await db.users.insert_one(user_dict)
    
    logger.info(f"User created by admin {current_user.email}: {user_data.email} (role: {user_data.role})")
    
    # Return user without password_hash
    user_dict.pop("password_hash")
    return UserResponse(**user_dict)


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Login endpoint - returns JWT tokens
    """
    # Find user by email
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not AuthUtils.verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user_doc.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create tokens
    tokens = AuthUtils.create_tokens(
        user_id=user_doc["id"],
        email=user_doc["email"],
        role=user_doc["role"]
    )
    
    logger.info(f"User logged in: {credentials.email}")
    
    return Token(**tokens)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    try:
        # Verify refresh token
        token_data = AuthUtils.verify_token(body.refresh_token, token_type="refresh")
        
        # Verify user still exists and is active
        user_doc = await db.users.find_one({"id": token_data.user_id}, {"_id": 0})
        
        if not user_doc or not user_doc.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new tokens
        tokens = AuthUtils.create_tokens(
            user_id=user_doc["id"],
            email=user_doc["email"],
            role=user_doc["role"]
        )
        
        return Token(**tokens)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get current authenticated user information with startup/onboarding data
    
    Returns:
    - User info
    - Startup data (if founder)
    - Onboarding data (if available)
    """
    response_data = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "organization_id": current_user.organization_id,
        "avatar_url": current_user.avatar_url,
        "is_active": current_user.is_active,
        "onboarding_completed": current_user.onboarding_completed,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login
    }
    
    # If founder, fetch startup and onboarding data
    if current_user.role == "founder":
        # Find startup linked to this founder
        startup = await db.startups.find_one(
            {"founder_id": current_user.id},
            {"_id": 0}
        )
        
        if startup:
            response_data["startup"] = startup
            
            # Fetch onboarding preferences
            preferences = await db.founder_preferences.find_one(
                {"founder_id": current_user.id},
                {"_id": 0}
            )
            if preferences:
                response_data["onboarding_data"] = preferences
        else:
            # Check if user has a company_name from registration
            if current_user.organization_id:
                # Try to find workspace
                workspace = await db.workspaces.find_one(
                    {"id": current_user.organization_id},
                    {"_id": 0}
                )
                if workspace:
                    response_data["workspace"] = workspace
    
    return response_data


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (client should delete tokens)
    """
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Successfully logged out"}


@router.post("/complete-onboarding")
async def complete_onboarding(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark the current user's onboarding as completed.
    Called after the user finishes their role-specific onboarding flow.
    """
    result = await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "onboarding_completed": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"Onboarding completed for user: {current_user.email} (role: {current_user.role})")
    return {"message": "Onboarding completed successfully", "onboarding_completed": True}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    List all users (Admin only)
    """
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Deactivate a user (Admin only)
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User deactivated: {user_id} by admin {current_user.email}")
    return {"message": "User deactivated successfully"}
