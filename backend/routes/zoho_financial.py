"""
routes/zoho_financial.py

FIX: Read `api_domain` from the zoho_connections document in MongoDB.
This is the correct regional domain returned by Zoho during the OAuth callback
(e.g. https://www.zohoapis.in for India).

The old code always passed `settings.zoho_api_domain` which defaults to
https://www.zohoapis.com (US) and caused 401 errors for non-US accounts.
"""

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
    return request.app.state.db


def _get_api_domain(connection: dict, settings) -> str:
    """
    Get the correct Zoho API domain for this connection.
    FIX: Prefer the api_domain stored on the connection (set during OAuth callback
    from the token response). Fall back to settings only if not present.
    """
    return connection.get("api_domain") or settings.zoho_api_domain


@router.get("/metrics")
async def get_financial_metrics(
    organization_id: str = Query(..., description="Startup organization ID"),
    refresh: bool = Query(False, description="Force refresh from Zoho Books"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve current financial metrics for an organization.
    Reads token from DB, refreshes if expired, fetches from Zoho Books.
    Results are cached for 30 minutes.
    """
    settings = get_settings()

    try:
        # ── Cache check ───────────────────────────────────────────────────────
        if not refresh:
            cached = await db.financial_metrics.find_one(
                {"organization_id": organization_id},
                {"_id": 0}
            )
            if cached:
                fetched_at = cached.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    logger.info(f"Returning cached financial metrics for {organization_id}")
                    return cached

        # ── Get connection from DB ────────────────────────────────────────────
        connection = await db.zoho_connections.find_one({
            "organization_id": organization_id,
            "is_active": True
        })

        if not connection:
            raise HTTPException(
                status_code=404,
                detail="Zoho Books not connected for this organization. Please connect Zoho Books first."
            )

        zoho_org_id = connection["zoho_organization_id"]
        # FIX: Use the regional api_domain from the connection, not settings
        api_domain  = _get_api_domain(connection, settings)

        # ── Get valid (possibly refreshed) access token ───────────────────────
        access_token = await TokenManager.get_valid_token(
            db=db,
            organization_id=organization_id,
            client_id=settings.zoho_client_id,
            client_secret=settings.zoho_client_secret,
            # FIX: Pass the correct regional domain for token refresh too
            api_domain=api_domain
        )

        # ── Fetch financial data ──────────────────────────────────────────────
        zoho_client = ZohoBooksClient(
            access_token=access_token,
            organization_id=zoho_org_id,
            api_domain=api_domain   # FIX: use regional domain
        )

        financial_service = FinancialService(
            zoho_client=zoho_client,
            organization_id=organization_id
        )

        metrics = await financial_service.fetch_all_financial_data()

        # ── Cache to DB ───────────────────────────────────────────────────────
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)

        await db.financial_metrics.update_one(
            {"organization_id": organization_id, "zoho_organization_id": zoho_org_id},
            {"$set": metrics_dict},
            upsert=True
        )

        logger.info(f"Financial metrics updated for {organization_id}")
        return metrics_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financial metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch financial metrics: {str(e)}")


@router.get("/invoices")
async def get_invoices(
    organization_id: str = Query(...),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = get_settings()

    connection = await db.zoho_connections.find_one({
        "organization_id": organization_id, "is_active": True
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Zoho Books not connected")

    api_domain = _get_api_domain(connection, settings)

    access_token = await TokenManager.get_valid_token(
        db=db, organization_id=organization_id,
        client_id=settings.zoho_client_id, client_secret=settings.zoho_client_secret,
        api_domain=api_domain
    )

    zoho_client = ZohoBooksClient(
        access_token=access_token,
        organization_id=connection["zoho_organization_id"],
        api_domain=api_domain
    )

    try:
        invoices_data = await zoho_client.get_invoices(status=status, page=page, per_page=per_page)
        return {
            "invoices":     invoices_data.get("invoices", []),
            "page_context": invoices_data.get("page_context", {}),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch invoices: {str(e)}")


@router.get("/expenses")
async def get_expenses(
    organization_id: str = Query(...),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = get_settings()

    connection = await db.zoho_connections.find_one({
        "organization_id": organization_id, "is_active": True
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Zoho Books not connected")

    api_domain   = _get_api_domain(connection, settings)
    access_token = await TokenManager.get_valid_token(
        db=db, organization_id=organization_id,
        client_id=settings.zoho_client_id, client_secret=settings.zoho_client_secret,
        api_domain=api_domain
    )

    zoho_client = ZohoBooksClient(
        access_token=access_token,
        organization_id=connection["zoho_organization_id"],
        api_domain=api_domain
    )

    try:
        data = await zoho_client.get_expenses(status=status, page=page, per_page=per_page)
        return {
            "expenses":     data.get("expenses", []),
            "page_context": data.get("page_context", {}),
            "organization_id": organization_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch expenses: {str(e)}")


@router.get("/accounts")
async def get_chart_of_accounts(
    organization_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    settings = get_settings()

    connection = await db.zoho_connections.find_one({
        "organization_id": organization_id, "is_active": True
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Zoho Books not connected")

    api_domain   = _get_api_domain(connection, settings)
    access_token = await TokenManager.get_valid_token(
        db=db, organization_id=organization_id,
        client_id=settings.zoho_client_id, client_secret=settings.zoho_client_secret,
        api_domain=api_domain
    )

    zoho_client = ZohoBooksClient(
        access_token=access_token,
        organization_id=connection["zoho_organization_id"],
        api_domain=api_domain
    )

    try:
        data = await zoho_client.get_chart_of_accounts()
        return {"accounts": data.get("chartofaccounts", []), "organization_id": organization_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")