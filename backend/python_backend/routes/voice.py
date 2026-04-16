from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.responses import Response
from middleware.auth import get_current_user
from middleware.api_key_resolver import resolve_keys
from services.voice_service import speech_to_text, text_to_speech
from database import get_db
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/voice", tags=["Voice"])

@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    keys = await resolve_keys(str(current_user.get("_id", current_user.get("id"))), db)
    audio_bytes = await audio.read()
    text = await speech_to_text(audio_bytes, keys)
    return {"transcript": text}

class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"

@router.post("/speak")
async def speak(
    payload: TTSRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    keys = await resolve_keys(str(current_user.get("_id", current_user.get("id"))), db)
    audio_bytes = await text_to_speech(payload.text, keys, payload.voice)
    if not audio_bytes:
        return {"error": "TTS failed. Add OpenAI or ElevenLabs key in Settings."}
    return Response(content=audio_bytes, media_type="audio/mpeg")
