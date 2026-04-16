from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from middleware.api_key_resolver import resolve_keys
from services.search_service import search_web
from database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/search", tags=["Search"])

class SearchRequest(BaseModel):
    query: str
    num_results: int = 8

@router.post("/")
async def live_search(
    payload: SearchRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    user_id = str(current_user.get("_id", current_user.get("id")))
    keys = await resolve_keys(user_id, db)
    result = await search_web(payload.query, keys.get("serper", ""), payload.num_results)
    return result
