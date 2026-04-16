from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user
from models.user_api_keys import UserAPIKeysUpdate
from utils.encryption import encrypt_key
from database import get_db
from datetime import datetime

router = APIRouter(prefix="/api/v1/keys", tags=["API Keys"])

# All supported key field names
_ALL_KEY_FIELDS = [
    "groq_api_key",
    "openai_api_key",
    "anthropic_api_key",
    "gemini_api_key",
    "serper_api_key",
    "stability_api_key",
    "elevenlabs_api_key",
]


@router.get("/")
async def get_my_keys(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Return masked API keys for the current user."""
    user_id = str(current_user.get("_id", current_user.get("id")))
    doc = await db.user_api_keys.find_one({"user_id": user_id})
    if not doc:
        return {"keys": {}}

    masked = {}
    for field in _ALL_KEY_FIELDS:
        val = doc.get(field)
        if val:
            # Return last 6 chars masked — enough to identify without leaking
            masked[field] = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + val[-6:]
    return {"keys": masked}


@router.post("/")
async def save_api_keys(
    payload: UserAPIKeysUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Save (encrypt) one or more API keys for the current user."""
    user_id = str(current_user.get("_id", current_user.get("id")))
    update_data = {"updated_at": datetime.utcnow()}

    fields = payload.dict(exclude_none=True)
    saved_count = 0
    for field, value in fields.items():
        if value and value.strip():
            update_data[field] = encrypt_key(value.strip())
            saved_count += 1

    if not saved_count:
        return {"status": "no_change", "message": "No valid keys provided"}

    await db.user_api_keys.update_one(
        {"user_id": user_id},
        {
            "$set": update_data,
            "$setOnInsert": {"user_id": user_id, "created_at": datetime.utcnow()},
        },
        upsert=True,
    )
    return {"status": "saved", "message": f"{saved_count} key(s) saved successfully"}


@router.delete("/{key_name}")
async def delete_key(
    key_name: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Delete a specific API key for the current user."""
    if key_name not in _ALL_KEY_FIELDS:
        raise HTTPException(status_code=400, detail=f"Invalid key name: {key_name}")

    await db.user_api_keys.update_one(
        {"user_id": str(current_user.get("_id", current_user.get("id")))},
        {"$unset": {key_name: ""}},
    )
    return {"status": "deleted", "key": key_name}
