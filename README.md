# AION — AI Operating Intelligence

A streaming AI assistant with JWT auth, multi-model routing, agent loop, RAG, and long-term memory.

## Stack
- Backend: Node.js (Express) + MongoDB + Redis + BullMQ
- Frontend: React + Vite + Tailwind
- AI: Groq / OpenAI with tool use and agent loop
- Deployment: Render (backend + frontend)

## Features
| Feature | Status |
|---|---|
| Streaming chat (SSE) | ✅ Live |
| JWT Authentication | ✅ Live |
| Multi-model routing | ✅ Live |
| Agent loop with tools | ✅ Live |
| Web search tool | ✅ Live (requires SERPAPI_KEY) |
| Code execution tool | ✅ Live |
| Long-term memory (RAG) | ✅ Live (requires PINECONE_API_KEY or pgvector) |
| File upload to context | ✅ Live (requires AWS_S3_BUCKET) |
| Voice synthesis | ✅ Live (requires GOOGLE_TTS_KEY or AZURE_SPEECH_KEY) |
| Multi-workspace | ✅ Live |

## Local Development
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker-compose up
```

## Environment Variables
See `backend/.env.example` and `frontend/.env.example` for all required variables.
