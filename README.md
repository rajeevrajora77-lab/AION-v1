# AION v1 - AI Operating Intelligence Network

A production-ready AI web application featuring real-time chat, intelligent search, and voice interaction capabilities.

## Features

### Core Capabilities
- **AI Chat System**: ChatGPT-like conversational interface with streaming responses
- **Intelligent Search Engine**: Custom search powered by BingSerpAPI with clean UI
- **Voice Assistant**: Speech-to-text and text-to-speech interactions
- **Real-time Streaming**: Live AI response generation
- **Chat History**: MongoDB-powered conversation persistence
- **Rate Limiting**: Production-grade API protection
- **Error Handling**: Comprehensive error management

## Tech Stack

### Frontend
- React 18
- Vite
- Axios
- Modern CSS3

### Backend
- Node.js
- Express.js
- MongoDB
- OpenAI-compatible API
- dotenv

### AI APIs
- OpenAI API (GPT-4/GPT-3.5)
- Bing Search API / SerpAPI
- Web Speech API

## Prerequisites

- Node.js 18 and npm
- MongoDB (local or Atlas)
- OpenAI API key
- Bing Search API key or SerpAPI key (optional)

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd aion
```

### 2. Environment Variables

Create `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/aion

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Search API (choose one)
BING_API_KEY=your-bing-api-key-here
# OR
SERPAPI_KEY=your-serpapi-key-here

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Backend Setup

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:5000`

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## API Endpoints

### Chat
- `POST /api/chat` - Stream AI responses
- `GET /api/chat/history` - Retrieve chat history
- `DELETE /api/chat/history/:id` - Delete conversation
- `POST /api/chat/complete` - Non-streaming chat completion
- `POST /api/chat/clear` - Clear all messages in a session
- `GET /api/chat/sessions` - List all chat sessions

### Search
- `POST /api/search` - Execute web search (returns title, snippet, source URL)
- `GET /api/search/suggestions` - Get search suggestions

### Voice
- `POST /api/voice/process` - Process voice transcription
- `POST /api/voice/synthesize` - Text-to-speech endpoint
- `GET /api/voice/config` - Get voice configuration

## Project Structure

```
aion/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Voice.jsx
│   │   │   └── Navigation.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── styles/
│   │   │   └── App.css
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── package.json
│   ├── vite.config.js
│   └── index.html
├── backend/
│   ├── routes/
│   │   ├── chat.js
│   │   ├── search.js
│   │   └── voice.js
│   ├── models/
│   │   └── Chat.js
│   ├── middleware/
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   └── openai.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── README.md
└── LICENSE
```

## Security Features

- Rate limiting (100 requests/15 minutes)
- Environment variable protection
- CORS configuration
- Input validation
- Error sanitization
- Helmet.js for HTTP headers

## Deployment

### Backend Deployment (Railway/Render/Heroku)

1. Set environment variables
2. Deploy from GitHub
3. Update MONGODB_URI to Atlas cluster

### Frontend Deployment (Vercel/Netlify)

1. Build: `npm run build`
2. Deploy dist folder
3. Update API_BASE_URL in production

## Roadmap - AION v2

- User authentication & authorization
- Multi-model support (Anthropic, Gemini)
- Advanced RAG with vector databases
- File upload analysis
- Collaborative chat rooms
- Mobile application (React Native)
- Plugin ecosystem
- Custom fine-tuned models
- Analytics dashboard
- WebSocket real-time updates
- Docker containerization
- Kubernetes orchestration

## Contributing

Contributions welcome! Please read CONTRIBUTING.md

## License

MIT License - See LICENSE file

---

Built with ❤️ by the AION Team
