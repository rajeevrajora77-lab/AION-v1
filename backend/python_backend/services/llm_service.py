import anthropic
import openai
from groq import AsyncGroq
from typing import AsyncGenerator
import logging
import os
from middleware.api_key_resolver import get_primary_llm_key

logger = logging.getLogger(__name__)

AION_SYSTEM_PROMPT = """
You are AION — AI Operating Intelligence by Rajora AI.
Always respond using proper Markdown: headers (##/###), **bold**,
`inline code`, fenced code blocks with language, bullet points,
tables, and > blockquotes. Be direct, precise, and structured.
Never say Sure!, Of course!, or Great question!
You are not ChatGPT or Claude — you are AION by Rajora AI.
"""

DEEP_THINK_PROMPT = """
You are AION in Deep Thinking Mode.
Before answering, reason through the problem step by step inside <thinking> tags. Show your complete reasoning chain. Then provide your final answer after </thinking> clearly structured with Markdown.
Take your time. Be thorough. Show all steps.
"""

RESEARCH_PROMPT = """
You are AION in Research Mode.
You have been provided with live web search results below.
Use them as your primary source. Cite sources with [1], [2] etc.
Structure your response as a proper research summary:
- Executive Summary
- Key Findings (with citations)
- Analysis
- Sources
Be factual, cite everything, do not hallucinate.
"""

# Model config per provider
_MODELS = {
    "groq": {
        "default": "llama-3.3-70b-versatile",
        "deep_think": "llama-3.3-70b-versatile",
        "research": "llama-3.3-70b-versatile",
    },
    "anthropic": {
        "default": "claude-3-5-sonnet-20241022",
        "deep_think": "claude-3-opus-20240229",
        "research": "claude-3-5-sonnet-20241022",
    },
    "openai": {
        "default": "gpt-4o-mini",
        "deep_think": "gpt-4o",
        "research": "gpt-4o-mini",
    },
    "gemini": {
        "default": "gemini-1.5-flash",
        "deep_think": "gemini-1.5-pro",
        "research": "gemini-1.5-flash",
    },
}


async def _stream_groq(
    api_key: str,
    messages: list,
    system: str,
    mode: str,
) -> AsyncGenerator[str, None]:
    client = AsyncGroq(api_key=api_key)
    model = _MODELS["groq"].get(mode, _MODELS["groq"]["default"])
    all_messages = [{"role": "system", "content": system}] + messages
    max_tokens = 8000 if mode in ["deep_think", "research"] else 4000
    stream = await client.chat.completions.create(
        model=model,
        messages=all_messages,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def _stream_anthropic(
    api_key: str,
    messages: list,
    system: str,
    mode: str,
) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=api_key)
    model = _MODELS["anthropic"].get(mode, _MODELS["anthropic"]["default"])
    max_tokens = 8192 if mode in ["deep_think", "research"] else 4096
    async with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openai(
    api_key: str,
    messages: list,
    system: str,
    mode: str,
) -> AsyncGenerator[str, None]:
    client = openai.AsyncOpenAI(api_key=api_key)
    model = _MODELS["openai"].get(mode, _MODELS["openai"]["default"])
    all_messages = [{"role": "system", "content": system}] + messages
    max_tokens = 8000 if mode in ["deep_think", "research"] else 4000
    stream = await client.chat.completions.create(
        model=model,
        messages=all_messages,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def stream_chat(
    messages: list,
    mode: str,
    api_keys: dict,
    search_context: str = None,
) -> AsyncGenerator[str, None]:
    """
    Stream a chat response using the best available LLM provider.
    Priority is determined by get_primary_llm_key() from api_key_resolver:
      1. User BYOK keys (anthropic > openai > groq > gemini)
      2. System keys (groq > openai > anthropic > gemini)
    NEVER fails due to missing user key. Only fails if NO system key exists.
    """
    system = AION_SYSTEM_PROMPT
    if mode == "deep_think":
        system = DEEP_THINK_PROMPT
    elif mode == "research" and search_context:
        system = RESEARCH_PROMPT + f"\n\n## SEARCH RESULTS:\n{search_context}"

    # Resolve best provider+key via strict priority logic
    try:
        provider, api_key = get_primary_llm_key(api_keys)
    except Exception as e:
        logger.error("No LLM key available: %s", e)
        yield "\u26a0\ufe0f No API key configured. Please contact support or add your API key in Settings \u2192 API Keys."
        return

    logger.info("LLM_CALL provider=%s mode=%s", provider, mode)

    try:
        if provider == "groq":
            async for chunk in _stream_groq(api_key, messages, system, mode):
                yield chunk
            return
        elif provider == "anthropic":
            async for chunk in _stream_anthropic(api_key, messages, system, mode):
                yield chunk
            return
        elif provider == "openai":
            async for chunk in _stream_openai(api_key, messages, system, mode):
                yield chunk
            return
        else:
            # Unknown provider fallback
            yield f"\u26a0\ufe0f Provider '{provider}' is not yet supported."
            return
    except Exception as primary_err:
        logger.warning(
            "Primary LLM failed provider=%s err=%s — attempting secondary fallback",
            provider, primary_err
        )

    # Secondary fallback: try remaining system keys in order
    sources = api_keys.get("_key_sources", {})
    fallback_order = ["groq", "openai", "anthropic"]
    for fb_provider in fallback_order:
        if fb_provider == provider:
            continue
        fb_key = api_keys.get(fb_provider, "")
        if not fb_key or sources.get(fb_provider) not in ("system", "user"):
            continue
        logger.info("LLM_FALLBACK provider=%s", fb_provider)
        try:
            if fb_provider == "groq":
                async for chunk in _stream_groq(fb_key, messages, system, mode):
                    yield chunk
                return
            elif fb_provider == "anthropic":
                async for chunk in _stream_anthropic(fb_key, messages, system, mode):
                    yield chunk
                return
            elif fb_provider == "openai":
                async for chunk in _stream_openai(fb_key, messages, system, mode):
                    yield chunk
                return
        except Exception as fb_err:
            logger.warning("Fallback failed provider=%s err=%s", fb_provider, fb_err)
            continue

    yield "\u26a0\ufe0f All LLM providers failed. Please try again later or contact support."
