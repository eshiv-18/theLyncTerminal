"""
Seed sample alerts, reports, and activities for testing
Run: python3 seed_content.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

async def seed_content():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Get sample startups
    startups = await db.startups.find({}, {"_id": 0}).to_list(10)
    if not startups:
        print("❌ No startups found. Please create workspaces and companies first.")
        return
    
    print(f"Found {len(startups)} startups")
    
    # Create sample alerts
    alerts = []
    for startup in startups[:3]:
        # Runway alert
        alerts.append({
            "id": str(uuid4()),
            "startup_id": startup["id"],
            "startup_name": startup["name"],
            "type": "runway",
            "severity": "critical" if startup.get("metrics", {}).get("runway_months", 12) < 6 else "warning",
            "title": f"Low Runway Alert - {startup['name']}",
            "message": f"Runway is {startup.get('metrics', {}).get('runway_months', 0)} months. Consider fundraising.",
            "metric_name": "runway_months",
            "metric_value": startup.get("metrics", {}).get("runway_months", 0),
            "threshold": 6,
            "is_read": False,
            "created_at": datetime.now(timezone.utc) - timedelta(hours=2),
            "action_required": True
        })
        
        # Growth alert
        alerts.append({
            "id": str(uuid4()),
            "startup_id": startup["id"],
            "startup_name": startup["name"],
            "type": "growth",
            "severity": "info",
            "title": f"Growth Milestone - {startup['name']}",
            "message": f"Revenue growth at {startup.get('metrics', {}).get('growth_rate', 0)}% this month!",
            "metric_name": "growth_rate",
            "metric_value": startup.get('metrics', {}).get('growth_rate', 0),
            "threshold": 20,
            "is_read": False,
            "created_at": datetime.now(timezone.utc) - timedelta(days=1),
            "action_required": False
        })
    
    if alerts:
        await db.alerts.delete_many({})  # Clear existing
        await db.alerts.insert_many(alerts)
        print(f"✓ Created {len(alerts)} alerts")
    
    # Create sample reports
    reports = []
    for idx, startup in enumerate(startups[:2]):
        # Get startup metrics for baseline
        metrics = startup.get("metrics", {})
        revenue = metrics.get("revenue", 500000)
        growth = metrics.get("growth_rate", 15.0)
        runway = metrics.get("runway_months", 18)
        
        reports.append({
            "id": str(uuid4()),
            "startup_id": startup["id"],
            "startup_name": startup["name"],
            "report_type": "monthly",
            "period": "2024-03",
            "status": "submitted",
            "summary_metrics": {
                "revenue": revenue,
                "revenue_growth": growth,
                "runway_months": runway,
                "burn_rate": metrics.get("burn_rate", 85000),
                "cash_balance": metrics.get("cash_balance", 1500000)
            },
            "sections": [
                {
                    "title": "Financial Update",
                    "content": f"Revenue up {growth}% MoM. Burn rate stable at $85K/month.",
                    "metrics": {"revenue": revenue, "burn_rate": 85000}
                },
                {
                    "title": "Product Progress",
                    "content": "Launched new feature X. Onboarded 50 new users.",
                    "metrics": {"new_users": 50}
                }
            ],
            "created_at": datetime.now(timezone.utc) - timedelta(days=5),
            "submitted_at": datetime.now(timezone.utc) - timedelta(days=3),
            "approved_at": None,
            "created_by": startup.get("founder_email", "founder@example.com"),
            "submitted_by": startup.get("founder_email", "founder@example.com")
        })
        
        # Quarterly draft report with summary metrics
        metrics_q = startup.get("metrics", {})
        reports.append({
            "id": str(uuid4()),
            "startup_id": startup["id"],
            "startup_name": startup["name"],
            "report_type": "quarterly",
            "period": "2024-Q1",
            "status": "draft",
            "summary_metrics": {
                "revenue": metrics_q.get("revenue", 450000),
                "revenue_growth": metrics_q.get("growth_rate", 12.0),
                "runway_months": metrics_q.get("runway_months", 16),
                "burn_rate": metrics_q.get("burn_rate", 90000),
                "cash_balance": metrics_q.get("cash_balance", 1440000)
            },
            "sections": [
                {
                    "title": "Q1 Summary",
                    "content": "Draft content for Q1 report...",
                    "metrics": {}
                }
            ],
            "created_at": datetime.now(timezone.utc) - timedelta(days=1),
            "submitted_at": None,
            "approved_at": None,
            "created_by": startup.get("founder_email", "founder@example.com"),
            "submitted_by": None
        })
    
    if reports:
        await db.reports.delete_many({})  # Clear existing
        await db.reports.insert_many(reports)
        print(f"✓ Created {len(reports)} reports")
    
    # Create sample activities
    activities = []
    for startup in startups[:3]:
        activities.extend([
            {
                "id": str(uuid4()),
                "type": "report_submitted",
                "actor": startup.get("founder_email", "founder@example.com"),
                "actor_role": "founder",
                "startup_id": startup["id"],
                "startup_name": startup["name"],
                "title": "Monthly Report Submitted",
                "description": f"{startup['name']} submitted their March monthly report",
                "metadata": {"report_type": "monthly", "period": "2024-03"},
                "created_at": datetime.now(timezone.utc) - timedelta(days=3)
            },
            {
                "id": str(uuid4()),
                "type": "metric_updated",
                "actor": "system",
                "actor_role": "admin",
                "startup_id": startup["id"],
                "startup_name": startup["name"],
                "title": "Metrics Updated",
                "description": f"Financial metrics updated for {startup['name']}",
                "metadata": {"source": "stripe", "metrics_updated": 5},
                "created_at": datetime.now(timezone.utc) - timedelta(hours=6)
            },
            {
                "id": str(uuid4()),
                "type": "integration_connected",
                "actor": startup.get("founder_email", "founder@example.com"),
                "actor_role": "founder",
                "startup_id": startup["id"],
                "startup_name": startup["name"],
                "title": "Integration Connected",
                "description": f"{startup['name']} connected Stripe integration",
                "metadata": {"integration": "stripe"},
                "created_at": datetime.now(timezone.utc) - timedelta(days=7)
            }
        ])
    
    if activities:
        await db.activities.delete_many({})  # Clear existing
        await db.activities.insert_many(activities)
        print(f"✓ Created {len(activities)} activities")
    
    print("\n✅ Content seeding complete!")
    print(f"   - {len(alerts)} alerts")
    print(f"   - {len(reports)} reports")
    print(f"   - {len(activities)} activities")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_content())
