# test_mongo.py for testing the db connection
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import asyncio

load_dotenv()

async def test_connection():
    try:
        client = AsyncIOMotorClient(os.environ['MONGO_URL'])
        db = client[os.environ['DB_NAME']]
        
        # Try to ping
        await db.command('ping')
        print("✅ MongoDB connection successful!")
        
        # Check collections
        collections = await db.list_collection_names()
        print(f"📊 Collections found: {collections}")
        
        # Check users
        user_count = await db.users.count_documents({})
        print(f"👥 Users in database: {user_count}")
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
    finally:
        client.close()

asyncio.run(test_connection())