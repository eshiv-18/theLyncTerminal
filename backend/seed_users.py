"""
Seed script to create test users for development

Run with: python seed_users.py
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
import sys

# Add parent directory to path to import utils
sys.path.insert(0, str(Path(__file__).parent))

from utils.auth import AuthUtils
from models.user_models import UserRole

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


async def seed_users():
    """Create test users for development"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding test users...")
    
    # Test users data
    test_users = [
        {
            "id": str(uuid4()),
            "email": "admin@startupintel.com",
            "name": "Admin User",
            "password": "admin123",
            "role": UserRole.ADMIN.value,
            "organization_id": None,
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": str(uuid4()),
            "email": "sarah.chen@vc.com",
            "name": "Sarah Chen",
            "password": "investor123",
            "role": UserRole.INVESTOR.value,
            "organization_id": "vc_firm_001",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        },
        {
            "id": str(uuid4()),
            "email": "alex.thompson@startup.com",
            "name": "Alex Thompson",
            "password": "founder123",
            "role": UserRole.FOUNDER.value,
            "organization_id": "startup_001",
            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        }
    ]
    
    # Insert or update users
    for user_data in test_users:
        # Check if user exists
        existing = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
        
        if existing:
            print(f"⚠️  User already exists: {user_data['email']}")
            continue
        
        # Hash password
        password = user_data.pop("password")
        user_data["password_hash"] = AuthUtils.hash_password(password)
        
        # Insert user
        await db.users.insert_one(user_data)
        print(f"✅ Created user: {user_data['email']} (role: {user_data['role']})")
    
    print("\n📋 Test Credentials:")
    print("=" * 50)
    print("Admin:")
    print("  Email: admin@startupintel.com")
    print("  Password: admin123")
    print("\nInvestor:")
    print("  Email: sarah.chen@vc.com")
    print("  Password: investor123")
    print("\nFounder:")
    print("  Email: alex.thompson@startup.com")
    print("  Password: founder123")
    print("=" * 50)
    print("\n✅ Seed completed!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_users())
