from fastapi import APIRouter, HTTPException, Request, Depends, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from config import get_settings
from services.razorpay_client import RazorpayClient
from services.razorpay_metrics_service import RazorpayMetricsService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/razorpay", tags=["razorpay-payments"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Dependency to get database instance"""
    return request.app.state.db


class RazorpaySetup(BaseModel):
    """Request model for setting up Razorpay credentials"""
    key_id: str
    key_secret: str
    webhook_secret: Optional[str] = None
    is_live_mode: bool = False


class CreateOrderRequest(BaseModel):
    """Request model for creating a payment order"""
    amount: int  # Amount in smallest currency unit (paise for INR)
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Optional[dict] = {}


@router.post("/setup")
async def setup_razorpay(
    organization_id: str = Query(..., description="Organization ID"),
    credentials: RazorpaySetup = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Setup Razorpay API credentials for an organization
    
    Args:
        organization_id: The startup organization ID
        credentials: Razorpay API credentials
    """
    try:
        # Validate credentials by making a test API call
        client = RazorpayClient(
            key_id=credentials.key_id,
            key_secret=credentials.key_secret
        )
        
        # Test the credentials
        try:
            await client.get_payments(count=1)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Razorpay credentials: {str(e)}"
            )
        
        # Check if credentials already exist
        existing_creds = await db.razorpay_credentials.find_one({
            "organization_id": organization_id
        })
        
        if existing_creds:
            # Update existing credentials
            await db.razorpay_credentials.update_one(
                {"organization_id": organization_id},
                {
                    "$set": {
                        "key_id": credentials.key_id,
                        "key_secret": credentials.key_secret,  # TODO: Encrypt in production
                        "webhook_secret": credentials.webhook_secret,
                        "is_live_mode": credentials.is_live_mode,
                        "updated_at": datetime.utcnow(),
                        "is_active": True
                    }
                }
            )
            logger.info(f"Updated Razorpay credentials for organization {organization_id}")
        else:
            # Create new credentials
            razorpay_creds = {
                "organization_id": organization_id,
                "key_id": credentials.key_id,
                "key_secret": credentials.key_secret,
                "webhook_secret": credentials.webhook_secret,
                "is_live_mode": credentials.is_live_mode,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            
            await db.razorpay_credentials.insert_one(razorpay_creds)
            logger.info(f"Created Razorpay credentials for organization {organization_id}")
        
        return {
            "status": "success",
            "message": "Razorpay credentials configured successfully",
            "mode": "live" if credentials.is_live_mode else "test"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up Razorpay: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to setup Razorpay: {str(e)}"
        )


@router.get("/status")
async def check_razorpay_status(
    organization_id: str = Query(..., description="Organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Check if Razorpay is configured for an organization"""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not credentials:
        return {
            "connected": False,
            "message": "Razorpay not configured"
        }
    
    return {
        "connected": True,
        "key_id": credentials.get("key_id"),
        "mode": "live" if credentials.get("is_live_mode") else "test",
        "last_updated": credentials.get("updated_at")
    }


@router.post("/orders")
async def create_order(
    organization_id: str = Query(..., description="Organization ID"),
    order_request: CreateOrderRequest = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new payment order"""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not credentials:
        raise HTTPException(
            status_code=404,
            detail="Razorpay not configured for this organization"
        )
    
    try:
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        
        order = await client.create_order(
            amount=order_request.amount,
            currency=order_request.currency,
            receipt=order_request.receipt,
            notes=order_request.notes
        )
        
        return {
            "status": "success",
            "order": order
        }
    
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )


@router.get("/metrics")
async def get_payment_metrics(
    organization_id: str = Query(..., description="Organization ID"),
    refresh: bool = Query(False, description="Force refresh from Razorpay"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retrieve payment metrics for an organization
    
    Args:
        organization_id: The startup organization ID
        refresh: If True, fetch fresh data from Razorpay
    """
    try:
        # Check if we should use cached data
        if not refresh:
            cached_metrics = await db.razorpay_metrics.find_one(
                {"organization_id": organization_id},
                {"_id": 0}
            )
            
            if cached_metrics:
                # Check if cache is recent (less than 30 minutes old)
                fetched_at = cached_metrics.get("fetched_at")
                if fetched_at and (datetime.utcnow() - fetched_at).total_seconds() < 1800:
                    logger.info(f"Returning cached Razorpay metrics for {organization_id}")
                    return cached_metrics
        
        # Get credentials
        credentials = await db.razorpay_credentials.find_one({
            "organization_id": organization_id,
            "is_active": True
        })
        
        if not credentials:
            raise HTTPException(
                status_code=404,
                detail="Razorpay not configured for this organization"
            )
        
        # Create client and fetch metrics
        logger.info(f"Fetching fresh Razorpay metrics for {organization_id}")
        
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        
        metrics_service = RazorpayMetricsService(
            razorpay_client=client,
            organization_id=organization_id
        )
        
        metrics = await metrics_service.fetch_all_payment_metrics()
        
        # Store/update metrics in database
        metrics_dict = metrics.dict()
        metrics_dict.pop("id", None)
        
        await db.razorpay_metrics.update_one(
            {"organization_id": organization_id},
            {"$set": metrics_dict},
            upsert=True
        )
        
        logger.info(f"Razorpay metrics updated for {organization_id}")
        return metrics_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Razorpay metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch Razorpay metrics: {str(e)}"
        )


@router.get("/payments")
async def get_payments(
    organization_id: str = Query(..., description="Organization ID"),
    count: int = Query(10, ge=1, le=100, description="Number of payments"),
    skip: int = Query(0, ge=0, description="Skip count"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve recent payments"""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not credentials:
        raise HTTPException(
            status_code=404,
            detail="Razorpay not configured"
        )
    
    try:
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        
        payments_response = await client.get_payments(count=count, skip=skip)
        
        return {
            "payments": payments_response.get("items", []),
            "count": len(payments_response.get("items", [])),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching payments: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch payments: {str(e)}"
        )


@router.get("/subscriptions")
async def get_subscriptions(
    organization_id: str = Query(..., description="Organization ID"),
    count: int = Query(10, ge=1, le=100, description="Number of subscriptions"),
    skip: int = Query(0, ge=0, description="Skip count"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Retrieve subscriptions"""
    credentials = await db.razorpay_credentials.find_one({
        "organization_id": organization_id,
        "is_active": True
    })
    
    if not credentials:
        raise HTTPException(
            status_code=404,
            detail="Razorpay not configured"
        )
    
    try:
        client = RazorpayClient(
            key_id=credentials["key_id"],
            key_secret=credentials["key_secret"]
        )
        
        subscriptions_response = await client.get_subscriptions(count=count, skip=skip)
        
        return {
            "subscriptions": subscriptions_response.get("items", []),
            "count": len(subscriptions_response.get("items", [])),
            "organization_id": organization_id
        }
    
    except Exception as e:
        logger.error(f"Error fetching subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch subscriptions: {str(e)}"
        )


@router.post("/sync")
async def sync_payment_data(
    organization_id: str = Query(..., description="Organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Manually trigger payment data sync"""
    try:
        metrics = await get_payment_metrics(
            organization_id=organization_id,
            refresh=True,
            db=db
        )
        
        return {
            "status": "success",
            "message": "Payment data synced successfully",
            "metrics": metrics
        }
    except Exception as e:
        logger.error(f"Error syncing payment data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync payment data: {str(e)}"
        )


@router.delete("/disconnect")
async def disconnect_razorpay(
    organization_id: str = Query(..., description="Organization ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Disconnect Razorpay integration"""
    result = await db.razorpay_credentials.update_one(
        {"organization_id": organization_id},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=404,
            detail="No Razorpay configuration found"
        )
    
    return {
        "status": "success",
        "message": "Razorpay disconnected successfully"
    }
