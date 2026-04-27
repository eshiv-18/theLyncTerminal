from fastapi import APIRouter, HTTPException, Request, Depends, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from config import get_settings
from services.razorpay_client import RazorpayClient
from services.razorpay_metrics_service import RazorpayMetricsService
import logging
import os


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/razorpay", tags=["razorpay-payments"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


class RazorpaySetup(BaseModel):
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = None
    is_live_mode: bool = False


class RazorpayConfigureRequest(BaseModel):
    """
    FIX: Frontend sends { organization_id, key_id, key_secret } as one JSON body.
    The old /setup endpoint expected organization_id as a query param and
    credentials as a separate Body(...). This model accepts everything in one body.
    """
    organization_id: str
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = None
    is_live_mode: bool = False


class CreateOrderRequest(BaseModel):
    amount: int
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[dict] = {}


async def _save_credentials(organization_id: str, key_id: str, key_secret: str,
                             webhook_secret: Optional[str], is_live_mode: bool, db) -> dict:
    """Shared logic for saving Razorpay credentials.
    
    FIX: Removed upfront credential validation (get_payments test call).
    The test call was returning 400 for test-mode keys with no payment history,
    blocking legitimate connects. Credentials are now saved immediately and
    validated lazily on the first metrics/payments fetch.
    Key format is still checked — must start with rzp_test_ or rzp_live_.
    """
    # Basic key format check only — don't make an API call to validate
    if not key_id.startswith(('rzp_test_', 'rzp_live_')):
        raise HTTPException(
            status_code=400,
            detail="Invalid Razorpay Key ID format. Must start with rzp_test_ or rzp_live_"
        )
    if len(key_secret) < 10:
        raise HTTPException(
            status_code=400,
            detail="Razorpay Key Secret appears too short. Please check your credentials."
        )

    existing = await db.razorpay_credentials.find_one({"organization_id": organization_id})
    update_doc = {
        "key_id": key_id,
        "key_secret": key_secret,
        "webhook_secret": webhook_secret,
        "is_live_mode": is_live_mode,
        "updated_at": datetime.utcnow(),
        "is_active": True,
    }

    if existing:
        await db.razorpay_credentials.update_one(
            {"organization_id": organization_id},
            {"$set": update_doc}
        )
        logger.info(f"Updated Razorpay credentials for org {organization_id}")
    else:
        update_doc.update({
            "organization_id": organization_id,
            "created_at": datetime.utcnow(),
        })
        await db.razorpay_credentials.insert_one(update_doc)
        logger.info(f"Created Razorpay credentials for org {organization_id}")

    return {
        "status": "success",
        "message": "Razorpay credentials configured successfully",
        "mode": "live" if is_live_mode else "test"
    }


# FIX: Added /configure endpoint to match frontend api.js call
# Frontend: apiClient.post('/api/payments/razorpay/configure', { organization_id, key_id, key_secret })
@router.post("/configure")
async def configure_razorpay(
    payload: RazorpayConfigureRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Configure Razorpay API credentials.
    Frontend sends organization_id + credentials all in one JSON body.
    """
    try:
        return await _save_credentials(
            organization_id=payload.organization_id,
            key_id=payload.key_id,
            key_secret=payload.key_secret,
            webhook_secret=payload.webhook_secret,
            is_live_mode=payload.is_live_mode,
            db=db
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring Razorpay: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to configure Razorpay: {str(e)}")


# Keep original /setup for backwards compat
@router.post("/setup")
async def setup_razorpay(
    organization_id: str = Query(...),
    credentials: RazorpaySetup = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Original setup endpoint (kept for backwards compat). Use /configure instead."""
    try:
        return await _save_credentials(
            organization_id=organization_id,
            key_id=credentials.key_id,
            key_secret=credentials.key_secret,
            webhook_secret=credentials.webhook_secret,
            is_live_mode=credentials.is_live_mode,
            db=db
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to setup Razorpay: {str(e)}")


@router.get("/status")
async def check_razorpay_status(
    organization_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Check if Razorpay is configured for an organization."""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not credentials:
        return {"connected": False, "message": "Razorpay not configured"}

    return {
        "connected": True,
        "key_id": credentials.get("key_id"),
        "is_live_mode": credentials.get("is_live_mode", False),
        "last_updated": credentials.get("updated_at"),
    }


@router.get("/metrics")
async def get_payment_metrics(
    organization_id: str = Query(...),
    refresh: bool = Query(False),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve payment metrics for an organization."""
    try:
        if not refresh:
            cached = await db.razorpay_metrics.find_one(
                {"organization_id": organization_id}, {"_id": 0}
            )
            if cached:
                from datetime import timedelta
                fetched_at = cached.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    return cached

        credentials = await db.razorpay_credentials.find_one({
            "organization_id": organization_id,
            "is_active": True
        })

        if not credentials:
            raise HTTPException(
                status_code=404,
                detail="Razorpay not configured for this organization"
            )
        
        logger.info(f"DEBUG credentials: key_id={credentials.get('key_id')} secret_len={len(credentials.get('key_secret', ''))}")


        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        metrics_service = RazorpayMetricsService(
            razorpay_client=client,
            organization_id=organization_id
        )

        metrics = await metrics_service.fetch_all_payment_metrics()
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)

        await db.razorpay_metrics.update_one(
            {"organization_id": organization_id},
            {"$set": metrics_dict},
            upsert=True
        )

        return metrics_dict

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Razorpay metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@router.get("/payments")
async def get_payments(
    organization_id: str = Query(...),
    count: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve recent payments from Razorpay."""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not credentials:
        raise HTTPException(status_code=404, detail="Razorpay not configured")

    try:
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        payments_data = await client.get_payments(count=count)
        return {
            "payments": payments_data.get("items", []),
            "count": payments_data.get("count", 0),
            "organization_id": organization_id
        }
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch payments: {str(e)}")


@router.get("/subscriptions")
async def get_subscriptions(
    organization_id: str = Query(...),
    count: int = Query(20, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve subscriptions from Razorpay."""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not credentials:
        raise HTTPException(status_code=404, detail="Razorpay not configured")

    try:
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        subs_data = await client.get_subscriptions(count=count)
        return {
            "subscriptions": subs_data.get("items", []),
            "count": subs_data.get("count", 0),
            "organization_id": organization_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscriptions: {str(e)}")


@router.post("/sync")
async def sync_payment_data(
    organization_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Manually trigger payment data sync."""
    return await get_payment_metrics(organization_id=organization_id, refresh=True, db=db)


# FIX: Frontend sends POST to /disconnect but backend had only DELETE.
# Added POST handler; kept DELETE for API clients.
@router.post("/disconnect")
@router.delete("/disconnect")
async def disconnect_razorpay(
    organization_id: str = Query(None),
    body: Optional[dict] = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Disconnect Razorpay integration."""
    # Support organization_id from query param or request body
    org_id = organization_id
    if not org_id and body:
        org_id = body.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="organization_id is required")

    result = await db.razorpay_credentials.update_one(
        {"organization_id": org_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No Razorpay configuration found")

    return {"status": "success", "message": "Razorpay disconnected successfully"}

# Only for testing in development phase - Eshiv ;)

# @router.get("/test-razorpay")
# async def test_razorpay():
#     from services.razorpay_client import RazorpayClient

#     key_id = os.getenv("RAZORPAY_KEY_ID")
#     key_secret = os.getenv("RAZORPAY_KEY_SECRET")

#     if not key_id or not key_secret:
#         raise HTTPException(status_code=500, detail="Razorpay env variables not set")

#     client = RazorpayClient(
#         key_id=key_id,
#         key_secret=key_secret
#     )
    
#     res = await client.get_payments(count=1)
#     return res
    
@router.post("/create-order")
async def create_order(
    organization_id: str,
    mock: bool = False,  
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    if mock:
        return {
            "order_id": "order_mock_12345",
            "amount": 50000,
            "currency": "INR"
        }

    from services.razorpay_client import RazorpayClient

    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })

    if not credentials:
        raise HTTPException(status_code=404, detail="Razorpay not configured")

    client = RazorpayClient(
        key_id=credentials["key_id"],
        key_secret=credentials["key_secret"]
    )

    order = await client.create_order(amount=50000)

    return {
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"]
    }