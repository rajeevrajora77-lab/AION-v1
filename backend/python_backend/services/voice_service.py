import httpx
import openai
import os
import uuid
import aiofiles
from pathlib import Path

async def speech_to_text(audio_bytes: bytes, api_keys: dict) -> str:
    if api_keys.get("openai"):
        try:
            import io
            client = openai.AsyncOpenAI(api_key=api_keys["openai"])
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "audio.webm"
            
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            return transcript.text
        except Exception as e:
            pass
            
    return "Could not transcribe audio. Add OpenAI API key in Settings."

async def text_to_speech(text: str, api_keys: dict, voice: str = "alloy") -> bytes:
    if api_keys.get("openai"):
        try:
            client = openai.AsyncOpenAI(api_key=api_keys["openai"])
            response = await client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text[:4096]
            )
            # OpenAI gives us bytes back when read
            return await response.aread() if hasattr(response, 'aread') else response.read()
        except Exception as e:
            pass
            
    if api_keys.get("elevenlabs"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
                    headers={
                        "xi-api-key": api_keys["elevenlabs"],
                        "Content-Type": "application/json"
                    },
                    json={
                        "text": text[:5000],
                        "model_id": "eleven_monolingual_v1",
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}
                    },
                    timeout=30.0
                )
                return response.content
        except Exception as e:
            pass
            
    return b""
