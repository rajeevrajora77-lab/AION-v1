import os
from motor.motor_asyncio import AsyncIOMotorClient

# Setup MongoDB Connection securely
class Database:
    client: AsyncIOMotorClient = None
    
db_instance = Database()

async def connect_to_mongo():
    db_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_instance.client = AsyncIOMotorClient(db_uri)

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()

async def get_db():
    # Provide the database instances
    # Use the specific DB name (defaulting to aion_db if not in URI explicitly or set db name directly)
    db_name = os.getenv("DATABASE_NAME", "aion_db")
    if db_instance.client is None:
        await connect_to_mongo()
    return db_instance.client[db_name]
