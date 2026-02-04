# AION v1 - Quick Start Implementation Guide

## Current Progress
- ✅ `backend/src/app.ts` - Express app bootstrap (CORS, Helmet, rate limiting, routes)
- ✅ `backend/src/api/routes/*` - Route implementations (auth/chat/search/voice/health)
- ✅ `backend/src/api/middleware/*` - Middleware implementations (auth, request logger, rate limiter, error handler)
- 🟡 Legacy (Phase 4): `backend/models/Chat.js`, `backend/models/User.js` - Still JS/Mongoose models; migrate into `backend/src/*`
- 🔄 Remaining backend work: move legacy `backend/utils/*` and `backend/models/*` into `backend/src/*` (Phase 4)
- 🔄 Frontend files needed

## Next Steps to Complete Implementation

### 1. Backend work (Phase 4+)
- Migrate utilities from `backend/utils/*` into `backend/src/*` (e.g., `src/services/*` or `src/infra/*`).
- Migrate models from `backend/models/*` into `backend/src/*` (e.g., `src/domain/*` or `src/infra/db/*`), update all imports to the new paths.
- Replace the inline global error handler in `backend/src/app.ts` with `backend/src/api/middleware/errorHandler.ts` (single source of truth).

### 2. Frontend restructure
- Move `backend/frontend/` → root-level `frontend/`.
- Create `frontend/src/` directory structure.

### 3. Create frontend files
- `frontend/index.html`
- `frontend/vite.config.js` (or `vite.config.ts` if you’re using TypeScript)
- `frontend/package.json`
- `frontend/.env.example`
- `frontend/src/main.jsx` (or `main.tsx`)
- `frontend/src/App.jsx` (or `App.tsx`)
- `frontend/src/services/api.js` (or `api.ts`)
- `frontend/src/components/` (Chat, Search, Voice, Navigation)
- `frontend/src/styles/App.css`

## Local run (backend)

```bash
cd backend
npm install
npm run build
npm start   # runs node dist/app.js
```

## Deploy with:
```bash
# Backend: Elastic Beanstalk / Railway / Render
# Use: npm run build && npm start (node dist/app.js)

# Frontend: Vercel / Netlify / S3+CloudFront
```

**Status**: Backend routes/middleware live under `backend/src/api/*`; Phase 4 will complete the remaining migrations so `backend/src/*` becomes the only source of truth.
