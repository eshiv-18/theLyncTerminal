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

# For development Only
# from fastapi.middleware.cors import CORSMiddleware

# Import all route routers
from routes.zoho_auth import router as zoho_auth_router
from routes.zoho_financial import router as zoho_financial_router
from routes.hubspot_auth import router as hubspot_auth_router
from routes.hubspot_data import router as hubspot_data_router
from routes.razorpay_payments import router as razorpay_payments_router
from routes.github_auth import router as github_auth_router
from routes.github_data import router as github_data_router
from routes.auth import router as auth_router
from routes.portfolio import router as portfolio_router
from routes.admin_onboarding import router as admin_onboarding_router
from routes.founder_onboarding import router as founder_onboarding_router
from routes.content import router as content_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create app
app = FastAPI(
    title="Startup Progress Intelligence API",
    description="API for startup portfolio monitoring and financial tracking",
    version="1.0.0"
)

# Store DB in app state
app.state.db = db

cors_origins_raw = os.environ.get('CORS_ORIGINS', '*')

# Build the allowed origins list
if cors_origins_raw.strip() == '*':
    allowed_origins = ['*']
else:
    allowed_origins = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Only For Development
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # allow all
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Rate limiting added AFTER CORS so CORS runs outermost
# FIX: Also set RATE_LIMIT_ENABLED=false in Vercel env vars since serverless

from middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# ─── Routes ───────────────────────────────────────────────────────────────────

api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Startup Intel API", "version": "1.0.0", "status": "running"}


@api_router.get("/health")
async def health_check():
    try:
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
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Register all routers
app.include_router(api_router)
app.include_router(auth_router,              prefix="/api")
app.include_router(portfolio_router,         prefix="/api")
app.include_router(admin_onboarding_router,  prefix="/api")
app.include_router(founder_onboarding_router,prefix="/api")
app.include_router(content_router,           prefix="/api")
app.include_router(zoho_auth_router,         prefix="/api")
app.include_router(zoho_financial_router,    prefix="/api")
app.include_router(hubspot_auth_router,      prefix="/api")
app.include_router(hubspot_data_router,      prefix="/api")
app.include_router(razorpay_payments_router, prefix="/api")
app.include_router(github_auth_router,       prefix="/api")
app.include_router(github_data_router,       prefix="/api")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("MongoDB connection closed")