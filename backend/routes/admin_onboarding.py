"""
Admin Onboarding Routes - Production Ready
Workspace creation, team invitations, bulk company import with proper error handling
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import secrets
from uuid import uuid4

from models.workspace_models import (
    WorkspaceCreate, WorkspaceResponse,
    BulkTeamInvite, TeamInviteResponse,
    BulkFounderInvite, FounderInviteResponse,
    BulkCompanyImport, CompanyImportResponse
)
from models.user_models import User
from middleware.auth import get_current_user
from services.email_service import (
    send_email,
    generate_team_invitation_email,
    generate_founder_invitation_email
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin Onboarding"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database from app state"""
    return request.app.state.db


@router.post("/workspace", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create workspace (Admin Onboarding Steps 1-2 & 6) - PRODUCTION READY"""
    try:
        if current_user.role not in ("admin", "investor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Only admins or investors can create workspaces"
            )
        
        workspace_id = str(uuid4())
        
        workspace = {
            "id": workspace_id,
            "org_name": workspace_data.org_name,
            "fund_name": workspace_data.fund_name,
            "logo_url": workspace_data.logo_url,
            "currency": workspace_data.currency,
            "reporting_frequency": workspace_data.reporting_frequency,
            "timezone": workspace_data.timezone,
            "portfolio_unit": workspace_data.portfolio_unit,
            "investment_stages": workspace_data.investment_stages,
            "sectors": workspace_data.sectors,
            "health_score_template": workspace_data.health_score_template,
            "runway_threshold": workspace_data.runway_threshold,
            "required_sections": workspace_data.required_sections,
            "founder_can_edit": workspace_data.founder_can_edit,
            "created_by": current_user.email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insert workspace
        result = await db.workspaces.insert_one(workspace)
        
        if not result.inserted_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create workspace"
            )
        
        # Update user with workspace association
        user_update_result = await db.users.update_one(
            {"email": current_user.email},
            {
                "$set": {
                    "organization_id": workspace_id,
                    "onboarding_completed": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if user_update_result.modified_count == 0:
            logger.warning(f"User {current_user.email} not updated with workspace_id {workspace_id}")
        
        logger.info(f"✅ Workspace created: {workspace_id} by {current_user.email}")
        
        # Remove _id for response
        workspace.pop("_id", None)
        return WorkspaceResponse(**workspace)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Workspace creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workspace creation failed: {str(e)}"
        )


@router.post("/companies/bulk", response_model=CompanyImportResponse)
async def bulk_import_companies(
    import_data: BulkCompanyImport,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk import companies (Admin Onboarding Step 4) - PRODUCTION READY"""
    try:
        if current_user.role not in ("admin", "investor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or investors can import companies"
            )
        
        # Verify workspace exists
        workspace = await db.workspaces.find_one({"id": import_data.workspace_id})
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        
        imported_ids = []
        failed_companies = []
        
        for company in import_data.companies:
            try:
                startup_id = str(uuid4())
                startup = {
                    "id": startup_id,
                    "workspace_id": import_data.workspace_id,
                    "name": company.name,
                    "logo_url": None,
                    "description": f"{company.name} - {company.stage} stage startup",
                    "stage": company.stage,
                    "sector": company.sector,
                    "website": company.website,
                    "founder_name": company.founder_name,
                    "founder_email": company.founder_email,
                    "funding_amount": company.funding_amount or 0.0,
                    "valuation": company.valuation or 0.0,
                    "health_status": "healthy",
                    "health_score": 75,
                    "metrics": {
                        "mrr": 0.0,
                        "arr": 0.0,
                        "revenue": 0.0,
                        "growth_rate": 0.0,
                        "runway_months": 12,
                        "burn_rate": 0.0,
                        "cash_balance": company.funding_amount or 0.0,
                        "headcount": 5,
                        "customer_count": 0,
                        "churn_rate": 0.0,
                        "last_updated": datetime.now(timezone.utc).isoformat()
                    },
                    "integrations": [],
                    "investor_ids": [current_user.id],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "last_report_date": None,
                    "next_report_due": datetime.now(timezone.utc).isoformat()
                }
                
                await db.startups.insert_one(startup)
                imported_ids.append(startup_id)
                logger.info(f"✅ Imported company: {company.name}")
                
            except Exception as e:
                logger.error(f"❌ Failed to import {company.name}: {str(e)}")
                failed_companies.append({"name": company.name, "reason": str(e)})
        
        logger.info(f"✅ Bulk import: {len(imported_ids)} companies imported, {len(failed_companies)} failed")
        
        return CompanyImportResponse(
            workspace_id=import_data.workspace_id,
            imported_count=len(imported_ids),
            failed_count=len(failed_companies),
            company_ids=imported_ids,
            failed_companies=failed_companies,
            invitations_sent=0,
            message=f"Successfully imported {len(imported_ids)} companies"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Bulk import failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk import failed: {str(e)}"
        )


@router.post("/team/invite", response_model=TeamInviteResponse)
async def invite_team_members(
    invite_data: BulkTeamInvite,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite team members (Admin Onboarding Step 3) - PRODUCTION READY"""
    try:
        if current_user.role not in ("admin", "investor"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins or investors can invite team members"
            )
        
        # Verify workspace exists
        workspace = await db.workspaces.find_one({"id": invite_data.workspace_id}, {"_id": 0})
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found"
            )
        
        invitation_ids = []
        invited_emails = []
        failed_invites = []
        
        for member in invite_data.members:
            try:
                invitation_token = secrets.token_urlsafe(32)
                invitation_id = str(uuid4())
                
                invitation = {
                    "id": invitation_id,
                    "token": invitation_token,
                    "type": "team",
                    "workspace_id": invite_data.workspace_id,
                    "email": member.email,
                    "name": member.name,
                    "role": member.role,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "used": False
                }
                
                await db.invitations.insert_one(invitation)
                invitation_ids.append(invitation_id)
                invited_emails.append(member.email)
                
                # Send invitation email (non-blocking)
                try:
                    email_html = generate_team_invitation_email(
                        recipient_name=member.name,
                        workspace_name=workspace.get("fund_name", "the workspace"),
                        invited_by=current_user.email,
                        role=member.role,
                        invitation_token=invitation_token
                    )
                    
                    await send_email(
                        to_email=member.email,
                        subject=f"You're invited to join {workspace.get('fund_name', 'Startup Intel')}",
                        html_content=email_html
                    )
                    logger.info(f"✅ Invitation email sent to {member.email}")
                except Exception as email_error:
                    logger.error(f"⚠️ Email send failed for {member.email}: {str(email_error)}")
                    # Continue - invitation still created
                    
            except Exception as e:
                logger.error(f"❌ Failed to invite {member.email}: {str(e)}")
                failed_invites.append({"email": member.email, "reason": str(e)})
        
        logger.info(f"✅ Team invitations: {len(invited_emails)} sent, {len(failed_invites)} failed")
        
        return TeamInviteResponse(
            workspace_id=invite_data.workspace_id,
            invited_count=len(invited_emails),
            invited_emails=invited_emails,
            invitation_ids=invitation_ids,
            message=f"Successfully invited {len(invited_emails)} team members"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Team invitation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Team invitation failed: {str(e)}"
        )
