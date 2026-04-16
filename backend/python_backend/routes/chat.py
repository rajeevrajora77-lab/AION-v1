from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from middleware.auth import get_current_user
from middleware.api_key_resolver import resolve_keys
from services.llm_service import stream_chat
from services.search_service import search_web
from services.research_service import run_research
from database import get_db
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    mode: str = "chat"
    file_ids: Optional[List[str]] = []
    conversation_id: Optional[str] = None

@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    user_id = str(current_user.get("_id", current_user.get("id")))
    keys = await resolve_keys(user_id, db)
    
    messages = [m.dict() for m in payload.messages]
    
    # Inject file content context
    if payload.file_ids:
        file_context = ""
        for fid in payload.file_ids:
            doc = await db.file_uploads.find_one({"_id": fid, "user_id": user_id})
            if doc and doc.get("extracted_text"):
                file_context += f"\\n\\n### File: {doc.get('original_name', 'Unknown')}\\n{doc['extracted_text'][:10000]}"
        
        if file_context and messages:
            messages[-1]["content"] += f"\\n\\n[ATTACHED FILES]{file_context}[/ATTACHED FILES]"
            
    if payload.mode == "research":
        last_message = messages[-1]["content"] if messages else ""
        return StreamingResponse(
            run_research(last_message, keys, messages[:-1]),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
        )
        
    search_context = None
    if payload.mode == "search":
        last_message = messages[-1]["content"] if messages else ""
        result = await search_web(last_message, keys.get("serper", ""))
        search_context = result.get("context", "")
        payload.mode = "research" # Use similar context injection internally
        
    async def event_stream():
        async for chunk in stream_chat(messages, payload.mode, keys, search_context):
            yield f"data: {json.dumps({'content': chunk})}\\n\\n"
        yield "data: [DONE]\\n\\n"
        
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
