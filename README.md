# AION v1 - AI Operating Intelligence Network

A production-ready AI web application featuring real-time chat, intelligent search, and voice interaction capabilities.

## Features

- AI chat with streaming responses
- Intelligent search (Bing / SerpAPI)
- Voice input/output (speech-to-text, text-to-speech)
- MongoDB-backed chat history
- Rate limiting, secure error handling, and environment-based configuration

## Tech stack

- Frontend: React 18 + Vite
- Backend: Node.js + Express (TypeScript build output)
- Database: MongoDB
- AI: OpenAI-compatible API

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key
- Optional: Bing Search API key or SerpAPI key

## Setup

### 1) Clone

```bash
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd AION-v1
```

### 2) Backend env

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/aion

# AI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Auth (required)
JWT_SECRET=your-long-random-secret

# Search (choose one)
BING_API_KEY=your-bing-api-key
# OR
SERPAPI_KEY=your-serpapi-key

# CORS
FRONTEND_URL=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3) Run backend

```bash
cd backend
npm install

# Dev (TypeScript)
npm run dev

# Or production-like:
# npm run build
# npm start
```

The backend build/start scripts compile TypeScript and run `dist/app.js`. 

### 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API endpoints (high level)

- Chat: `/api/chat`, `/api/chat/history`, `/api/chat/sessions`
- Search: `/api/search`, `/api/search/suggestions`
- Voice: `/api/voice/*`

## Deployment notes

For platforms that support a Procfile, the backend Procfile uses `npm run build && npm run start`. 

## License

MIT (see `LICENSE`).
