# AION v1

AION (AI Operations Node) is a production-grade conversational AI platform with multi-model LLM routing, persistent session memory, voice interaction, and web search integration. It's the primary user-facing AI layer of the Rajora AI ecosystem.

The core idea: route each user request to the right model at the right cost, maintain full conversation context across sessions, and deliver responses via chat, voice, or search — all from a single unified API.

---

## What's Inside

**LLM routing** — Requests are classified by complexity and routed to GPT-4, GPT-3.5, or a fallback model. Simple queries don't burn expensive API quota.

**Streaming responses** — The frontend receives token-by-token output via SSE. No loading spinners waiting for the full response.

**Session persistence** — Conversation history is stored in MongoDB, keyed by session ID. Context survives page refreshes and multiple browser tabs.

**Voice interface** — Web Speech API handles STT on the client. TTS synthesis is served from the backend. No third-party voice SDK dependency.

**Web search** — Bing Search API / SerpAPI integration with a clean results UI. The AI can ground responses in live web data when needed.

**Rate limiting** — Per-IP and per-session rate limits via `express-rate-limit`. Configurable via environment variables.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| LLMs | OpenAI GPT-4 / GPT-3.5 |
| Search | Bing Search API, SerpAPI |
| Voice | Web Speech API (client-side) |
| Auth | JWT |
| Security | Helmet.js, CORS, express-rate-limit |

---

## Repository Structure

```
AION-v1/
├── backend/
│   ├── routes/
│   │   ├── chat.js          Streaming + non-streaming chat endpoints
│   │   ├── search.js        Web search integration
│   │   └── voice.js         Voice transcription + synthesis
│   ├── models/
│   │   └── Chat.js          MongoDB session schema
│   ├── middleware/
│   │   ├── rateLimiter.js   Per-IP and per-session limiting
│   │   └── errorHandler.js  Sanitized error responses
│   ├── utils/
│   │   └── openai.js        LLM routing and streaming helpers
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Chat.jsx
    │   │   ├── Search.jsx
    │   │   ├── Voice.jsx
    │   │   └── Navigation.jsx
    │   └── services/api.js
    └── vite.config.js
```

---

## Setup

```bash
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd AION-v1
```

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
npm start
# Runs on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/aion

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Search (one of these)
BING_API_KEY=...
SERPAPI_KEY=...

# CORS
FRONTEND_URL=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## API Reference

**Chat**
```
POST   /api/chat              Stream AI response (SSE)
POST   /api/chat/complete     Non-streaming completion
GET    /api/chat/history      Retrieve session history
GET    /api/chat/sessions     List all sessions
DELETE /api/chat/history/:id  Delete conversation
POST   /api/chat/clear        Clear session messages
```

**Search**
```
POST   /api/search                Execute web search
GET    /api/search/suggestions    Search suggestions
```

**Voice**
```
POST   /api/voice/process     Process voice transcription
POST   /api/voice/synthesize  Text-to-speech
GET    /api/voice/config      Voice configuration
```

---

## Roadmap

- Multi-model support (Claude, Gemini) with cost-aware routing
- RAG pipeline with vector database for document-grounded answers
- File upload analysis (PDFs, images)
- User authentication and per-user session isolation
- WebSocket upgrade for true bidirectional streaming
- Mobile client (React Native)
- Custom fine-tuned model integration via Revive-OS

---

## Deployment

Backend deploys on Railway or AWS Elastic Beanstalk via Docker. Frontend deploys on Vercel.

```bash
# Production build
cd frontend && npm run build

# Docker
docker build -t aion-backend ./backend
docker run -p 5000:5000 --env-file .env aion-backend
```

See CI/CD config in `.github/workflows/ci.yml`.

---

## License

MIT — see [LICENSE](./LICENSE)

**Rajora AI** · [rajora.live](https://rajora.live) · rajeev@rajora.live
