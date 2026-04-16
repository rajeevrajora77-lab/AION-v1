import os
import re
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from utils.encryption import decrypt_key
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key format validators
# ---------------------------------------------------------------------------
_KEY_VALIDATORS = {
    "groq":       lambda k: k.startswith("gsk_"),
    "openai":     lambda k: k.startswith("sk-"),
    "anthropic":  lambda k: k.startswith("sk-ant-"),
    "serper":     lambda k: len(k) >= 20,
    "stability":  lambda k: len(k) >= 20,
    "elevenlabs": lambda k: len(k) >= 20,
    "gemini":     lambda k: k.startswith("AI") or len(k) >= 20,
}

# ---------------------------------------------------------------------------
# System environment variable mapping  (NEVER exposed to frontend)
# ---------------------------------------------------------------------------
_SYSTEM_ENV = {
    "groq":       "GROQ_API_KEY",
    "openai":     "OPENAI_API_KEY",
    "anthropic":  "ANTHROPIC_API_KEY",
    "serper":     "SERPER_API_KEY",
    "stability":  "STABILITY_API_KEY",
    "elevenlabs": "ELEVENLABS_API_KEY",
    "gemini":     "GEMINI_API_KEY",
}

# ---------------------------------------------------------------------------
# DB field mapping
# ---------------------------------------------------------------------------
_DB_FIELD = {
    "groq":       "groq_api_key",
    "openai":     "openai_api_key",
    "anthropic":  "anthropic_api_key",
    "serper":     "serper_api_key",
    "stability":  "stability_api_key",
    "elevenlabs": "elevenlabs_api_key",
    "gemini":     "gemini_api_key",
}


def _mask(key: str) -> str:
    """Return a safe log-friendly masked version of a key."""
    if not key or len(key) < 8:
        return "***"
    return key[:4] + "****" + key[-4:]


def _is_valid_key(provider: str, key: str) -> bool:
    """Validate a key: non-empty after trim, meets format rules."""
    if not key or not key.strip():
        return False
    key = key.strip()
    validator = _KEY_VALIDATORS.get(provider)
    if validator:
        return validator(key)
    return True  # Unknown provider — accept if non-empty


def _get_system_key(provider: str) -> str:
    """Read system key directly from env. Returns empty string if missing."""
    env_var = _SYSTEM_ENV.get(provider, "")
    return os.getenv(env_var, "").strip()


async def resolve_keys(
    user_id: str,
    db: AsyncIOMotorDatabase,
) -> dict:
    """
    Resolve API keys with strict priority:
      1. User-supplied key (BYOK) — validated, trimmed, decrypted from DB
      2. System key (env var)     — always available as fallback

    NEVER fails due to a missing user key.
    ONLY fails (500) if system key itself is missing for groq
    (the primary LLM provider).

    Returns a dict with keys: groq, openai, anthropic, serper,
    stability, elevenlabs, gemini.
    Each entry is also annotated as _key_source: dict mapping
    provider -> "user" | "system" | "none"
    """
    doc = None
    try:
        doc = await db.user_api_keys.find_one({"user_id": user_id})
    except Exception as db_err:
        logger.warning("DB lookup failed for user %s: %s", user_id, db_err)

    resolved: dict = {}
    key_sources: dict = {}

    for provider in _SYSTEM_ENV.keys():
        user_key_raw = ""
        db_field = _DB_FIELD.get(provider, "")

        # ---- Step 1: Try user's stored key ----
        if doc and db_field and doc.get(db_field):
            try:
                user_key_raw = decrypt_key(doc[db_field])
            except Exception:
                user_key_raw = ""

        if _is_valid_key(provider, user_key_raw):
            resolved[provider] = user_key_raw.strip()
            key_sources[provider] = "user"
            logger.info(
                "USING_USER_KEY provider=%s user=%s key=%s",
                provider, user_id, _mask(user_key_raw)
            )
        else:
            # ---- Step 2: Fallback to system key ----
            system_key = _get_system_key(provider)

            if system_key and _is_valid_key(provider, system_key):
                resolved[provider] = system_key
                key_sources[provider] = "system"
                logger.info(
                    "USING_SYSTEM_KEY provider=%s user=%s",
                    provider, user_id
                )
            else:
                resolved[provider] = ""
                key_sources[provider] = "none"
                if provider == "groq":
                    # Primary LLM provider MUST have a key
                    logger.error(
                        "SYSTEM_KEY_MISSING provider=%s — chat will fail",
                        provider
                    )

    # Embed source metadata safely inside the dict (prefixed with _)
    resolved["_key_sources"] = key_sources

    return resolved


def get_primary_llm_key(keys: dict) -> tuple[str, str]:
    """
    Returns (provider_name, api_key) for the best available LLM.
    Priority: user-key anthropic > user-key openai > user-key groq
              > system groq > system openai > system anthropic

    Raises HTTPException 500 if NO LLM key is available at all.
    """
    sources = keys.get("_key_sources", {})

    # User-owned keys take priority (better UX, offloads cost)
    for provider in ["anthropic", "openai", "groq", "gemini"]:
        if sources.get(provider) == "user" and keys.get(provider):
            return provider, keys[provider]

    # System keys fallback
    for provider in ["groq", "openai", "anthropic", "gemini"]:
        if sources.get(provider) == "system" and keys.get(provider):
            return provider, keys[provider]

    raise HTTPException(
        status_code=500,
        detail={
            "error": "System API key not configured",
            "code": "SYSTEM_KEY_MISSING"
        }
    )
