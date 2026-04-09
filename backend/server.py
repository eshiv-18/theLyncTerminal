from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

# Import Zoho Books routes
from routes.zoho_auth import router as zoho_auth_router
from routes.zoho_financial import router as zoho_financial_router

# Import HubSpot routes
from routes.hubspot_auth import router as hubspot_auth_router
from routes.hubspot_data import router as hubspot_data_router

# Import Razorpay routes
from routes.razorpay_payments import router as razorpay_payments_router

# Import GitHub routes
from routes.github_auth import router as github_auth_router
from routes.github_data import router as github_data_router

# Import Auth routes
from routes.auth import router as auth_router

# Import Portfolio routes
from routes.portfolio import router as portfolio_router

# Import Admin Onboarding routes
from routes.admin_onboarding import router as admin_onboarding_router

# Import Founder Onboarding routes
from routes.founder_onboarding import router as founder_onboarding_router

# Import Content routes (Alerts, Reports, Feed)
from routes.content import router as content_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="Startup Progress Intelligence API",
    description="API for startup portfolio monitoring and financial tracking",
    version="1.0.0"
)

# Store database reference in app state for dependency injection
app.state.db = db

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Startup Intel API", "version": "1.0.0", "status": "running"}

@api_router.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring and deployment platforms
    """
    try:
        # Check MongoDB connection
        await db.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include the router in the main app
app.include_router(api_router)

# Configure CORS with environment variable
allowed_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins] if allowed_origins != ['*'] else ['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
from middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# Include Zoho Books integration routers
app.include_router(zoho_auth_router, prefix="/api")
app.include_router(zoho_financial_router, prefix="/api")

# Include HubSpot integration routers
app.include_router(hubspot_auth_router, prefix="/api")
app.include_router(hubspot_data_router, prefix="/api")

# Include Admin & Founder Onboarding routers
app.include_router(admin_onboarding_router, prefix="/api")
app.include_router(founder_onboarding_router, prefix="/api")


# Include Content router (Alerts, Reports, Feed)
app.include_router(content_router, prefix="/api")


# Include Razorpay integration routers
app.include_router(razorpay_payments_router, prefix="/api")

# Include GitHub integration routers
app.include_router(github_auth_router, prefix="/api")
app.include_router(github_data_router, prefix="/api")

# Include Authentication router
app.include_router(auth_router, prefix="/api")

# Include Portfolio router
app.include_router(portfolio_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed")