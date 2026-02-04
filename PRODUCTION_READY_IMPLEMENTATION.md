# AION v1 - Production-ready implementation guide

> **Objective**: Transform AION v1 to production-ready with full authentication, UI, routing, testing, and robust state management.

## Current status

- Backend: Migration in progress (Phase 3 complete: routes + middleware moved under `backend/src/api/*`).
- Frontend: In progress.

---

## Current backend structure (post-Phase 3)

```
backend/
├── src/
│   ├── app.ts                      ← Express app bootstrap
│   ├── index.ts                    ← Dev entry (tsx)
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── search.ts
│   │   │   ├── voice.ts
│   │   │   └── health.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── requestLogger.ts
│   │       ├── rateLimiter.ts
│   │       └── errorHandler.ts
├── dist/                           ← Production build output (tsc)
├── models/                         ← Legacy (Phase 4 will move to src/)
├── utils/                          ← Legacy (Phase 4 will move to src/)
└── .env.example
```

### Runtime entrypoints

- Local dev: `npm run dev` (runs `tsx src/index.ts`).
- Production: `npm run build` then `npm start` (runs `node dist/app.js`).

---

## Phase 4+ (remaining work)

### 1) Move legacy code into src/

- Move `backend/models/*` into `backend/src/` (domain or infra layer).
- Move `backend/utils/*` into `backend/src/` (services layer).

### 2) Centralize error handling

- Replace the inline global error handler in `backend/src/app.ts` with `backend/src/api/middleware/errorHandler.ts`.

### 3) Add typed request contracts

- Replace `any` request/response types in `backend/src/api/routes/*` and `backend/src/api/middleware/*` with typed interfaces.

---

Note: Older docs referenced the legacy `backend/routes/*`, `backend/middleware/*`, and `backend/server.js` layout. The backend now runs via TypeScript entrypoints and compiled output (see `backend/package.json`).
