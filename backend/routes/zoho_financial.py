from fastapi import APIRouter, HTTPException, Request, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
from config import get_settings
from services.zoho_client import ZohoBooksClient
from services.token_manager import TokenManager
from services.financial_service import FinancialService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/financial", tags=["financial-data"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


@router.get("/metrics")
async def get_financial_metrics(
    organization_id: str = Query(..., description="Startup organization ID"),
    refresh: bool = Query(False, description="Force refresh from Zoho Books"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve current financial metrics for an organization
    
    Args:
        organization_id: The startup organization ID
        refresh: If True, fetch fresh data from Zoho Books
    
    Returns:
        Financial metrics including revenue, expenses, burn rate, runway
    """
    settings = get_settings()
    
    try:
        # Check if we should use cached data
        if not refresh:
            cached_metrics = await db.financial_metrics.find_one(
                {"organization_id": organization_id},
                {"_id": 0}
            )
            
            if cached_metrics:
                # Check if cache is recent (less than 30 minutes old)
                fetched_at = cached_metrics.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    logger.info(f"Returning cached financial metrics for {organization_id}")
                    return cached_metrics
        
        # Get valid access token
        logger.info(f"Fetching fresh financial data for {organization_id}")
        
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            api_domain=settings.zoho_api_domain
        )
        
        # Get Zoho organization ID
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        if not connection:
            raise HTTPException(
                status_code=404,
                detail="Zoho Books not connected for this organization"
            )
        
        zoho_org_id = connection["zoho_organization_id"]
        
        # Create Zoho client and fetch data
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=settings.zoho_api_domain
        )
        
        financial_service = FinancialService(
            zoho_client=zoho_client,
            organization_id=organization_id
        )
        
        metrics = await financial_service.fetch_all_financial_data()
        
        # Store/update metrics in database
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)  # Remove id field for upsert
        
        await db.financial_metrics.update_one(
            {
                "organization_id": organization_id,
                "zoho_organization_id": zoho_org_id
            },
            {"$set": metrics_dict},
            upsert=True
        )
        
        logger.info(f"Financial metrics updated for {organization_id}")
        return metrics_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financial metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch financial metrics: {str(e)}"
        )


@router.get("/invoices")
async def get_invoices(
    organization_id: str = Query(..., description="Startup organization ID"),
    status: Optional[str] = Query(None, description="Filter by status (paid, unpaid, overdue)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Results per page"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve invoices from Zoho Books
    
    Args:
        organization_id: The startup organization ID
        status: Filter by invoice status
        page: Page number for pagination
        per_page: Number of results per page
    """
    settings = get_settings()
    
    try:
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            api_domain=settings.zoho_api_domain
        )
        
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        zoho_org_id = connection["zoho_organization_id"]
        
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=settings.zoho_api_domain
        )
        
        invoices_data = await zoho_client.get_invoices(
            status=status,
            page=page,
            per_page=per_page
        )
        
        return {
            "invoices": invoices_data.get("invoices", []),
            "page_context": invoices_data.get("page_context", {}),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch invoices: {str(e)}"
        )


@router.get("/expenses")
async def get_expenses(
    organization_id: str = Query(..., description="Startup organization ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Results per page"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve expenses from Zoho Books
    
    Args:
        organization_id: The startup organization ID
        status: Filter by expense status
        page: Page number for pagination
        per_page: Number of results per page
    """
    settings = get_settings()
    
    try:
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            api_domain=settings.zoho_api_domain
        )
        
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        zoho_org_id = connection["zoho_organization_id"]
        
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=settings.zoho_api_domain
        )
        
        expenses_data = await zoho_client.get_expenses(
            status=status,
            page=page,
            per_page=per_page
        )
        
        return {
            "expenses": expenses_data.get("expenses", []),
            "page_context": expenses_data.get("page_context", {}),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching expenses: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch expenses: {str(e)}"
        )


@router.get("/accounts")
async def get_chart_of_accounts(
    organization_id: str = Query(..., description="Startup organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve chart of accounts from Zoho Books
    
    Args:
        organization_id: The startup organization ID
    """
    settings = get_settings()
    
    try:
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            api_domain=settings.zoho_api_domain
        )
        
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        zoho_org_id = connection["zoho_organization_id"]
        
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=settings.zoho_api_domain
        )
        
        accounts_data = await zoho_client.get_chart_of_accounts()
        
        return {
            "accounts": accounts_data.get("chartofaccounts", []),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching chart of accounts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch chart of accounts: {str(e)}"
        )


@router.get("/bills")
async def get_bills(
    organization_id: str = Query(..., description="Startup organization ID"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Results per page"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve bills from Zoho Books
    
    Args:
        organization_id: The startup organization ID
        page: Page number for pagination
        per_page: Number of results per page
    """
    settings = get_settings()
    
    try:
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            api_domain=settings.zoho_api_domain
        )
        
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        zoho_org_id = connection["zoho_organization_id"]
        
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=settings.zoho_api_domain
        )
        
        bills_data = await zoho_client.get_bills(
            page=page,
            per_page=per_page
        )
        
        return {
            "bills": bills_data.get("bills", []),
            "page_context": bills_data.get("page_context", {}),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching bills: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch bills: {str(e)}"
        )
