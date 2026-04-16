from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Message(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    role: str                           # user / assistant / system
    content: str
    mode: str = "chat"                  # chat / deep_think / research
    attachments: Optional[list] = []    # file uploads
    images: Optional[list] = []         # generated images
    search_results: Optional[list] = [] # web search citations
    thinking_steps: Optional[str] = None
    audio_url: Optional[str] = None
    tokens_used: Optional[int] = None
    created_at: datetime = datetime.utcnow()
