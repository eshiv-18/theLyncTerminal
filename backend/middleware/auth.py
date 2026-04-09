from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from models.user_models import User, UserRole
from utils.auth import AuthUtils
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get the current authenticated user
    
    Usage in routes:
        @router.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user.email}
    """
    token = credentials.credentials
    db = request.app.state.db
    
    # Verify token
    token_data = AuthUtils.verify_token(token, token_type="access")
    
    # Get user from database
    user_doc = await db.users.find_one({"id": token_data.user_id}, {"_id": 0})
    
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user_doc.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return User(**user_doc)


def require_role(*allowed_roles: UserRole):
    """
    Dependency factory to require specific roles
    
    Usage:
        @router.get("/admin-only")
        async def admin_route(
            current_user: User = Depends(require_role(UserRole.ADMIN))
        ):
            return {"message": "Admin access granted"}
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    
    return role_checker


def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Dependency for optional authentication
    Returns user if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        token_data = AuthUtils.verify_token(token, token_type="access")
        return token_data
    except:
        return None
