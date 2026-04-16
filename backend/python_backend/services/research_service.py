from services.search_service import search_web
from services.llm_service import stream_chat
from typing import AsyncGenerator

RESEARCH_QUERIES_PROMPT = """
Given this research topic, generate exactly 4 focused search queries 
to gather comprehensive information. Return ONLY a JSON array of strings.
Example: ["query 1", "query 2", "query 3", "query 4"]
Topic: {topic}
"""

async def run_research(
    topic: str,
    api_keys: dict,
    conversation_history: list
) -> AsyncGenerator[str, None]:
    
    yield "data: [STEP]Generating search queries...[/STEP]\\n\\n"
    
    queries = [topic, f"{topic} latest 2025", f"{topic} analysis", f"{topic} explained"]
    
    try:
        import anthropic, json
        if api_keys.get("anthropic"):
            client = anthropic.AsyncAnthropic(api_key=api_keys["anthropic"])
            msg = await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=256,
                messages=[{"role": "user", "content": RESEARCH_QUERIES_PROMPT.format(topic=topic)}]
            )
            raw = msg.content[0].text.strip()
            queries = json.loads(raw)
    except:
        pass
    
    all_results = []
    all_context = ""
    
    for i, query in enumerate(queries[:4], 1):
        yield f"data: [STEP]Searching: {query}[/STEP]\\n\\n"
        result = await search_web(query, api_keys.get("serper", ""), num_results=5)
        if result.get("results"):
            all_results.extend(result["results"])
            all_context += f"### Search {i}: {query}\\n{result.get('context', '')}\\n\\n"
    
    yield f"data: [STEP]Synthesizing {len(all_results)} sources...[/STEP]\\n\\n"
    
    messages = conversation_history + [{
        "role": "user",
        "content": f"Research topic: {topic}\\n\\nPlease provide a comprehensive research report."
    }]
    
    yield "data: [RESPONSE_START]\\n\\n"
    
    async for chunk in stream_chat(messages, "research", api_keys, search_context=all_context):
        yield f"data: {chunk}\\n\\n"
    
    yield "data: [DONE]\\n\\n"
