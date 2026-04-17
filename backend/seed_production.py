"""
Production Database Seeding Script
Seeds essential data for testing and demo
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from uuid import uuid4
import os
from dotenv import load_dotenv
from utils.auth import AuthUtils

load_dotenv()

async def seed_database():
    """Seed database with demo data"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # 1. Create admin/investor user
    admin_id = str(uuid4())
    admin_password = AuthUtils.hash_password("Admin@123")
    
    admin_user = {
        "id": admin_id,
        "email": "admin@startup.com",
        "name": "Admin User",
        "password_hash": admin_password,
        "role": "investor",
        "organization_id": None,
        "is_active": True,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "avatar_url": None
    }
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"email": "admin@startup.com"})
    if not existing_admin:
        await db.users.insert_one(admin_user)
        print(f"✅ Created admin user: admin@startup.com / Admin@123")
    else:
        print("⚠️  Admin user already exists")
    
    # 2. Create founder user
    founder_id = str(uuid4())
    founder_password = AuthUtils.hash_password("Founder@123")
    
    founder_user = {
        "id": founder_id,
        "email": "founder@startup.com",
        "name": "Founder User",
        "password_hash": founder_password,
        "role": "founder",
        "organization_id": None,
        "is_active": True,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "avatar_url": None
    }
    
    existing_founder = await db.users.find_one({"email": "founder@startup.com"})
    if not existing_founder:
        await db.users.insert_one(founder_user)
        print(f"✅ Created founder user: founder@startup.com / Founder@123")
    else:
        print("⚠️  Founder user already exists")
    
    print("\n🎉 Database seeding complete!")
    print("\n📋 Test Credentials:")
    print("   Admin: admin@startup.com / Admin@123")
    print("   Founder: founder@startup.com / Founder@123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())