from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.user_api_keys import UserAPIKeysUpdate
from utils.encryption import encrypt_key
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/api/v1/keys", tags=["API Keys"])

@router.get("/")
async def get_my_keys(current_user=Depends(get_current_user), db=Depends(get_db)):
    doc = await db.user_api_keys.find_one({"user_id": str(current_user.get("_id", current_user.get("id")))})
    if not doc:
        return {"keys": {}}
    
    masked = {}
    key_fields = ["openai_api_key", "anthropic_api_key", "gemini_api_key",
                  "serper_api_key", "stability_api_key", "elevenlabs_api_key"]
    for field in key_fields:
        if doc.get(field):
            masked[field] = "••••••••" + doc[field][-6:]
    return {"keys": masked}

@router.post("/")
async def save_api_keys(
    payload: UserAPIKeysUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    user_id = str(current_user.get("_id", current_user.get("id")))
    update_data = {"updated_at": datetime.utcnow()}
    
    fields = payload.dict(exclude_none=True)
    for field, value in fields.items():
        if value and value.strip():
            update_data[field] = encrypt_key(value.strip())
    
    await db.user_api_keys.update_one(
        {"user_id": user_id},
        {"$set": update_data, "$setOnInsert": {"user_id": user_id, "created_at": datetime.utcnow()}},
        upsert=True
    )
    return {"status": "saved", "message": "API keys updated successfully"}

@router.delete("/{key_name}")
async def delete_key(
    key_name: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    valid_keys = ["openai_api_key", "anthropic_api_key", "gemini_api_key",
                  "serper_api_key", "stability_api_key", "elevenlabs_api_key"]
    if key_name not in valid_keys:
        raise HTTPException(status_code=400, detail="Invalid key name")
    
    await db.user_api_keys.update_one(
        {"user_id": str(current_user.get("_id", current_user.get("id")))},
        {"$unset": {key_name: ""}}
    )
    return {"status": "deleted"}
