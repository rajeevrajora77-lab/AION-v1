import httpx

async def search_web(query: str, serper_api_key: str, num_results: int = 8) -> dict:
    if not serper_api_key:
        return {"error": "No Serper API key", "results": []}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": serper_api_key,
                    "Content-Type": "application/json"
                },
                json={"q": query, "num": num_results},
                timeout=10.0
            )
            data = response.json()
        except Exception as e:
            return {"error": str(e), "results": []}
    
    results = []
    
    # Organic results
    for i, item in enumerate(data.get("organic", [])[:num_results], 1):
        results.append({
            "index": i,
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "url": item.get("link", ""),
            "date": item.get("date", "")
        })
    
    # Knowledge graph if present
    kg = data.get("knowledgeGraph", {})
    if kg:
        results.insert(0, {
            "index": 0,
            "title": kg.get("title", ""),
            "snippet": kg.get("description", ""),
            "url": kg.get("website", ""),
            "type": "knowledge_graph"
        })
    
    # Format as context string for LLM
    context = ""
    for r in results:
        context += f"[{r['index']}] {r['title']}\n{r['snippet']}\nURL: {r['url']}\n\n"
    
    return {"results": results, "context": context}
