from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserAPIKeys(BaseModel):
    user_id: str
    groq_api_key: Optional[str] = None       # Primary LLM (Llama 3.3 70B)
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None     # For web search
    stability_api_key: Optional[str] = None  # For image generation
    elevenlabs_api_key: Optional[str] = None # For voice
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()


class UserAPIKeysUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    stability_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
