"""
Founder Onboarding Routes - Simplified
Handles founder workspace setup and onboarding completion
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from datetime import datetime, timezone
from uuid import uuid4

from models.workspace_models import FounderOnboardingData, FounderOnboardingComplete
from models.user_models import User
from middleware.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/founder", tags=["Founder Onboarding"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


@router.get("/invitation/{token}")
async def verify_invitation(
    token: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify founder invitation token (Step 1)"""
    invitation = await db.invitations.find_one(
        {"token": token, "type": "founder", "used": False},
        {"_id": 0}
    )
    
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invitation")
    
    startup = await db.startups.find_one({"id": invitation["startup_id"]}, {"_id": 0})
    workspace = await db.workspaces.find_one({"id": invitation["workspace_id"]}, {"_id": 0})
    
    return {
        "invitation": invitation,
        "startup": startup,
        "workspace": workspace,
        "valid": True
    }


@router.post("/onboarding/complete", response_model=FounderOnboardingComplete)
async def complete_founder_onboarding(
    onboarding_data: FounderOnboardingData,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Complete founder onboarding (All 10 steps)"""
    invitation = await db.invitations.find_one(
        {"token": onboarding_data.invitation_token, "type": "founder", "used": False},
        {"_id": 0}
    )
    
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invitation")
    
    if not onboarding_data.understood_data_sharing or not onboarding_data.reviewed_visibility:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Data sharing consent required")
    
    startup_id = invitation["startup_id"]
    workspace_id = invitation["workspace_id"]
    
    # Create founder user if doesn't exist
    existing_user = await db.users.find_one({"email": invitation["email"]}, {"_id": 0})
    
    if existing_user:
        founder_id = existing_user["id"]
    else:
        founder_id = str(uuid4())
        # Import bcrypt here
        import bcrypt
        temp_password = bcrypt.hashpw("ChangeMe123!".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        founder_user = {
            "id": founder_id,
            "email": invitation["email"],
            "name": invitation["name"],
            "hashed_password": temp_password,
            "role": "founder",
            "organization_id": workspace_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(founder_user)
    
    # Update startup with onboarding data
    startup_update = {
        "founder_id": founder_id,
        "website": onboarding_data.website,
        "sector": onboarding_data.sector,
        "stage": onboarding_data.stage,
        "business_model": onboarding_data.business_model,
        "onboarding_completed": True,
        "onboarding_completed_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.startups.update_one({"id": startup_id}, {"$set": startup_update})
    
    # Save preferences
    preferences = {
        "id": str(uuid4()),
        "startup_id": startup_id,
        "founder_id": founder_id,
        "workspace_id": workspace_id,
        "sharing_preferences": onboarding_data.sharing_preferences,
        "report_due_date": onboarding_data.report_due_date,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.founder_preferences.insert_one(preferences)
    
    # Mark invitation as used
    await db.invitations.update_one(
        {"token": onboarding_data.invitation_token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"Founder onboarding completed for startup {startup_id}")
    
    return FounderOnboardingComplete(
        startup_id=startup_id,
        workspace_id=workspace_id,
        founder_id=founder_id,
        onboarding_completed=True,
        workspace_ready=True,
        integrations_count=len(onboarding_data.connected_sources),
        team_invited_count=len(onboarding_data.team_members),
        message="Onboarding completed successfully!"
    )


@router.get("/onboarding/status/{startup_id}")
async def get_onboarding_status(
    startup_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check founder onboarding completion status"""
    startup = await db.startups.find_one({"id": startup_id}, {"_id": 0})
    
    if not startup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Startup not found")
    
    return {
        "startup_id": startup_id,
        "onboarding_completed": startup.get("onboarding_completed", False),
        "onboarding_completed_at": startup.get("onboarding_completed_at"),
        "founder_id": startup.get("founder_id")
    }


# ============================
# NEW: SELF-REGISTERED ONBOARDING
# ============================

@router.post("/onboarding/save")
async def save_founder_onboarding(
    onboarding_data: dict,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save onboarding for self-registered founders - PRODUCTION READY"""
    try:
        # Get current user
        user = await db.users.find_one({"id": current_user.id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Extract data from frontend (matching EnhancedFounderOnboarding.js structure)
        company_name = onboarding_data.get("companyName") or onboarding_data.get("company_name")
        
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        
        # 1. Create startup
        startup_id = str(uuid4())
        
        startup = {
            "id": startup_id,
            "name": company_name,
            "website": onboarding_data.get("website"),
            "sector": onboarding_data.get("sector"),
            "stage": onboarding_data.get("stage"),
            "business_model": onboarding_data.get("businessModel") or onboarding_data.get("business_model"),
            "hq": onboarding_data.get("hq"),
            "founder_name": onboarding_data.get("founders") or user.get("name"),
            "founder_email": onboarding_data.get("contactEmail") or user.get("email"),
            "founder_id": user["id"],
            "founder_user_id": user["id"],
            "description": f"{company_name} - {onboarding_data.get('sector', 'Tech')} startup",
            "health_status": "healthy",
            "health_score": 80,
            "funding_amount": 0.0,
            "valuation": 0.0,
            "metrics": {
                "mrr": 0.0,
                "arr": 0.0,
                "revenue": 0.0,
                "growth_rate": 0.0,
                "runway_months": 0,
                "burn_rate": 0.0,
                "cash_balance": 0.0,
                "headcount": len(onboarding_data.get("teamMembers", [])) + 1,
                "customer_count": 0,
                "churn_rate": 0.0,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "integrations": onboarding_data.get("connectedSources", []),
            "investor_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_report_date": None,
            "next_report_due": datetime.now(timezone.utc).isoformat(),
            "onboarding_completed": True,
            "onboarding_completed_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.startups.insert_one(startup)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create startup")
        
        # 2. Save founder preferences
        preferences = {
            "id": str(uuid4()),
            "startup_id": startup_id,
            "founder_id": user["id"],
            "workspace_id": startup_id,  # For self-registered, startup acts as workspace
            "sharing_preferences": onboarding_data.get("sharingPreferences", {}),
            "report_due_date": onboarding_data.get("reportDueDate", 5),
            "reminder_schedule": onboarding_data.get("reminderSchedule", "3_days"),
            "board_report_frequency": onboarding_data.get("boardReportFreq", "quarterly"),
            "auto_generate_drafts": onboarding_data.get("autoGenerateDrafts", True),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.founder_preferences.insert_one(preferences)
        
        # 3. Update user with startup association and mark onboarding complete
        user_update = await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "organization_id": startup_id,
                    "onboarding_completed": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if user_update.modified_count == 0:
            logger.warning(f"User {user['id']} was not updated")
        
        logger.info(f"✅ Founder onboarding completed for {user['email']} - Startup: {company_name}")
        
        return {
            "message": "Onboarding saved successfully",
            "startup_id": startup_id,
            "onboarding_completed": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Founder onboarding save failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save onboarding: {str(e)}"
        )


# ============================
# NEW: GET STARTUP DATA
# ============================

@router.get("/startup/data")
async def get_startup_data(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's startup"""

    user = await db.users.find_one({"id": current_user.id})

    if not user or not user.get("organization_id"):
        raise HTTPException(status_code=404, detail="No startup found")

    startup = await db.startups.find_one(
        {"id": user["organization_id"]},
        {"_id": 0}
    )

    return startup
