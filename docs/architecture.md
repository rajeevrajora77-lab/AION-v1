# AION v1 — System Architecture

**Rajora AI** | https://rajora.live

---

## System Components

```
┌──────────────────────────────────────────────────┐
│                      AION v1                            │
│                                                         │
│  ┌────────────────┐    ┌─────────────────────┐   │
│  │   React UI      │─► │  Node.js REST API    │   │
│  │   Dashboard     │    │  (Express + JWT)     │   │
│  └────────────────┘    └─────────────────────┘   │
│                                  │                     │
│                      ┌─────────────────────┐         │
│                      │      LLM Router          │         │
│                      │  OpenAI / Gemini /       │         │
│                      │  Claude / Custom SLM     │         │
│                      └─────────────────────┘         │
│                                  │                     │
│                      ┌─────────────────────┐         │
│                      │   MongoDB Atlas          │         │
│                      │   Session / History      │         │
│                      └─────────────────────┘         │
└──────────────────────────────────────────────────┘
```

## Data Flow

1. User sends message via **React UI** or direct **API call**
2. **Express API** validates authentication (JWT)
3. **LLM Router** selects model based on context, cost policy, and availability
4. Response returned with session context persisted to **MongoDB**
5. Conversation history stored for context-aware follow-ups

## LLM Routing Logic

```
Incoming Request
      │
      ▼
  Context Analyzer
      │
      ├── Simple query      →  Gemini Flash (low cost)
      ├── Complex reasoning →  Claude / GPT-4
      ├── Domain-specific   →  Rajora SLM
      └── Fallback          →  OpenAI GPT-3.5
```

## Deployment Architecture

```
Vercel (Frontend)   ←─── React Build (npm run build)
        │
 Railway / AWS EB   ←─── Node.js API (Docker)
        │
 MongoDB Atlas      ←─── Managed Database
```

## External Services

| Service | Purpose | SDK |
|---------|---------|-----|
| MongoDB Atlas | Session & conversation storage | mongoose |
| OpenAI API | Primary LLM | openai |
| Gemini API | Cost-efficient LLM | @google/generative-ai |
| Claude API | High-reasoning LLM | @anthropic-ai/sdk |
| Revive-OS | Infrastructure backbone | REST API |

---

**Rajora AI** | https://rajora.live | rajeev@rajora.live
