import anthropic
import openai
from typing import AsyncGenerator
import os

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
Before answering, reason through the problem step by step inside 
<thinking> tags. Show your complete reasoning chain. Then provide 
your final answer after </thinking> clearly structured with Markdown.
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

async def stream_chat(
    messages: list,
    mode: str,
    api_keys: dict,
    search_context: str = None
) -> AsyncGenerator[str, None]:
    
    system = AION_SYSTEM_PROMPT
    if mode == "deep_think":
        system = DEEP_THINK_PROMPT
    elif mode == "research" and search_context:
        system = RESEARCH_PROMPT + f"\n\n## SEARCH RESULTS:\n{search_context}"
    
    # Try Anthropic first, fallback to OpenAI
    if api_keys.get("anthropic"):
        client = anthropic.AsyncAnthropic(api_key=api_keys["anthropic"])
        model = "claude-3-opus-20240229" if mode == "deep_think" else "claude-3-5-sonnet-20241022"
        
        # In Anthropic API, deep think via budget_tokens requires extended thinking enabled.
        # It's supported on Sonnet 3.5, but let's conform to standard system prompts here.
        # Fallback to standard if we hit an error, but let's implement the standard streaming first.
        try:
            async with client.messages.stream(
                model=model,
                max_tokens=8192 if mode in ["deep_think", "research"] else 4096,
                system=system,
                messages=messages
            ) as stream:
                async for text in stream.text_stream:
                    yield text
            return
        except Exception as e:
            # Fallback below
            pass

    if api_keys.get("openai"):
        client = openai.AsyncOpenAI(api_key=api_keys["openai"])
        model = "gpt-4o" if mode == "deep_think" else "gpt-4o-mini"
        
        all_messages = [{"role": "system", "content": system}] + messages
        
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=all_messages,
                max_tokens=8000 if mode == "deep_think" else 4000,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            return
        except Exception as e:
            pass
            
    yield "⚠️ No API key configured or fallback failed. Please add your API key in Settings → API Keys."
