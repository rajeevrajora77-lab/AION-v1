from utils.encryption import decrypt_key
from motor.motor_asyncio import AsyncIOMotorDatabase
import os

async def resolve_keys(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    doc = await db.user_api_keys.find_one({"user_id": user_id})
    
    def get(field, env_fallback):
        # User key first
        if doc and doc.get(field):
            try:
                return decrypt_key(doc[field])
            except:
                pass
        # System fallback
        return os.getenv(env_fallback, "")
    
    return {
        "openai":      get("openai_api_key",      "OPENAI_API_KEY"),
        "anthropic":   get("anthropic_api_key",   "ANTHROPIC_API_KEY"),
        "serper":      get("serper_api_key",       "SERPER_API_KEY"),
        "stability":   get("stability_api_key",    "STABILITY_API_KEY"),
        "elevenlabs":  get("elevenlabs_api_key",   "ELEVENLABS_API_KEY"),
    }
