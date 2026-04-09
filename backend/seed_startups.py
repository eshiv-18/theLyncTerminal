"""
Seed script to create sample startups for development

Run with: python seed_startups.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone, timedelta
import sys

sys.path.insert(0, str(Path(__file__).parent))

from models.startup_models import StartupStage, HealthStatus

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


async def seed_startups():
    """Create sample startups for development"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding sample startups...")
    
    # Get investor user ID (sarah.chen@vc.com)
    investor = await db.users.find_one({"email": "sarah.chen@vc.com"}, {"_id": 0})
    investor_id = investor["id"] if investor else "investor_001"
    
    # Get founder user ID (alex.thompson@startup.com)
    founder = await db.users.find_one({"email": "alex.thompson@startup.com"}, {"_id": 0})
    founder_id = founder["id"] if founder else "founder_001"
    
    # Sample startups
    sample_startups = [
        {
            "id": str(uuid4()),
            "name": "TechFlow AI",
            "logo_url": "https://api.dicebear.com/7.x/shapes/svg?seed=techflow",
            "description": "AI-powered workflow automation platform",
            "website": "https://techflow.ai",
            "stage": StartupStage.SERIES_A.value,
            "funding_amount": 5000000.0,
            "valuation": 25000000.0,
            "investment_date": (datetime.now(timezone.utc) - timedelta(days=180)).isoformat(),
            "health_status": HealthStatus.HEALTHY.value,
            "health_score": 85,
            "founder_name": "Alex Thompson",
            "founder_email": "alex.thompson@startup.com",
            "founder_user_id": founder_id,
            "investor_ids": [investor_id],
            "metrics": {
                "mrr": 125000.0,
                "arr": 1500000.0,
                "revenue": 150000.0,
                "burn_rate": 75000.0,
                "cash_balance": 1500000.0,
                "runway_months": 18,
                "growth_rate": 15.0,
                "customer_count": 45,
                "churn_rate": 3.5,
                "headcount": 12,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "integrations": [
                {"name": "zoho", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "hubspot", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "github", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_report_date": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "next_report_due": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
        },
        {
            "id": str(uuid4()),
            "name": "CloudScale SaaS",
            "logo_url": "https://api.dicebear.com/7.x/shapes/svg?seed=cloudscale",
            "description": "Cloud infrastructure management platform",
            "website": "https://cloudscale.io",
            "stage": StartupStage.SEED.value,
            "funding_amount": 1500000.0,
            "valuation": 8000000.0,
            "investment_date": (datetime.now(timezone.utc) - timedelta(days=90)).isoformat(),
            "health_status": HealthStatus.WARNING.value,
            "health_score": 65,
            "founder_name": "Emma Wilson",
            "founder_email": "emma@cloudscale.io",
            "founder_user_id": None,
            "investor_ids": [investor_id],
            "metrics": {
                "mrr": 45000.0,
                "arr": 540000.0,
                "revenue": 50000.0,
                "burn_rate": 85000.0,
                "cash_balance": 850000.0,
                "runway_months": 10,
                "growth_rate": 22.0,
                "customer_count": 28,
                "churn_rate": 5.2,
                "headcount": 8,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "integrations": [
                {"name": "zoho", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "hubspot", "connected": False, "last_sync": None},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_report_date": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat(),
            "next_report_due": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        },
        {
            "id": str(uuid4()),
            "name": "DataPulse Analytics",
            "logo_url": "https://api.dicebear.com/7.x/shapes/svg?seed=datapulse",
            "description": "Real-time business intelligence platform",
            "website": "https://datapulse.com",
            "stage": StartupStage.SERIES_B.value,
            "funding_amount": 15000000.0,
            "valuation": 100000000.0,
            "investment_date": (datetime.now(timezone.utc) - timedelta(days=365)).isoformat(),
            "health_status": HealthStatus.HEALTHY.value,
            "health_score": 92,
            "founder_name": "Michael Chen",
            "founder_email": "michael@datapulse.com",
            "founder_user_id": None,
            "investor_ids": [investor_id],
            "metrics": {
                "mrr": 250000.0,
                "arr": 3000000.0,
                "revenue": 280000.0,
                "burn_rate": 150000.0,
                "cash_balance": 8000000.0,
                "runway_months": 36,
                "growth_rate": 18.0,
                "customer_count": 120,
                "churn_rate": 2.1,
                "headcount": 35,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "integrations": [
                {"name": "zoho", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "hubspot", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "razorpay", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
                {"name": "github", "connected": True, "last_sync": datetime.now(timezone.utc).isoformat()},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_report_date": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "next_report_due": (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
        },
        {
            "id": str(uuid4()),
            "name": "FinTech Innovate",
            "logo_url": "https://api.dicebear.com/7.x/shapes/svg?seed=fintech",
            "description": "Next-gen payment solutions",
            "website": "https://fintechinnovate.com",
            "stage": StartupStage.SEED.value,
            "funding_amount": 2000000.0,
            "valuation": 12000000.0,
            "investment_date": (datetime.now(timezone.utc) - timedelta(days=60)).isoformat(),
            "health_status": HealthStatus.CRITICAL.value,
            "health_score": 45,
            "founder_name": "Sarah Park",
            "founder_email": "sarah@fintechinnovate.com",
            "founder_user_id": None,
            "investor_ids": [investor_id],
            "metrics": {
                "mrr": 20000.0,
                "arr": 240000.0,
                "revenue": 25000.0,
                "burn_rate": 120000.0,
                "cash_balance": 480000.0,
                "runway_months": 4,
                "growth_rate": 8.0,
                "customer_count": 15,
                "churn_rate": 8.5,
                "headcount": 6,
                "last_updated": datetime.now(timezone.utc).isoformat()
            },
            "integrations": [
                {"name": "zoho", "connected": False, "last_sync": None},
                {"name": "hubspot", "connected": False, "last_sync": None},
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_report_date": (datetime.now(timezone.utc) - timedelta(days=35)).isoformat(),
            "next_report_due": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()  # Overdue!
        }
    ]
    
    # Insert or update startups
    for startup_data in sample_startups:
        # Check if startup exists
        existing = await db.startups.find_one({"name": startup_data["name"]}, {"_id": 0})
        
        if existing:
            print(f"⚠️  Startup already exists: {startup_data['name']}")
            continue
        
        # Insert startup
        await db.startups.insert_one(startup_data)
        print(f"✅ Created startup: {startup_data['name']} ({startup_data['stage']})")
    
    print(f"\n✅ Seed completed! Created {len(sample_startups)} startups")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_startups())
