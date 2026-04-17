# AION v1 Zero-Downtime Deployment Status

**Last Updated**: Feb 4, 2026
**Status**: 🟡 IN PROGRESS — Infra Ready, Aligning Docs + Final Code Integration

## MISSION
Make the new AION UI (Python FastAPI backend + React frontend) live on production without downtime using shadow routing and controlled promotion.

---

## COMPLETION CHECKLIST

### ✅ PHASE 1-4: INFRASTRUCTURE & CONFIGURATION
- [x] Elastic Beanstalk environment established and healthy
- [x] Node.js backend stable and running
- [x] GitHub Actions CI/CD pipeline working
- [x] Python FastAPI backend created and tested
- [x] Streaming endpoints (SSE) implemented
- [x] Health check endpoints (`/health`, `/ready`) configured
- [x] Start command aligned to TypeScript build output: `web: npm run build && npm start` (runs `dist/app.js`)
- [x] `.ebextensions/03-python-backend.config` created for Python startup
- [x] `http-proxy-middleware` added to dependencies
- [x] Shadow routing architecture designed and documented

### 🟡 PHASE 5: CODE INTEGRATION (IN PROGRESS)

**COMPLETED:**
- [x] Added `http-proxy-middleware@^2.0.6` to package.json
- [x] Created implementation guide at `backend/SHADOW_ROUTING_IMPLEMENTATION.md`
- [x] Configured Python startup via `.ebextensions/03-python-backend.config`

**REMAINING (update TS backend, not legacy server.js):**
- [ ] Update TypeScript backend entrypoint (see `backend/src/app.ts`) to add shadow routing for API and UI
- [ ] Build frontend UI (`npm run build` in `frontend/`)
- [ ] Verify Python `requirements.txt` exists in `backend/python_backend/`
- [ ] Test shadow paths before promotion

### 🟡 PHASE 6-7: TESTING & GO-LIVE (NOT STARTED)
- [ ] Shadow testing on `/__aion_shadow/ui` and `/__aion_shadow/api`
- [ ] Verify streaming works without buffering
- [ ] Load testing with concurrent users
- [ ] Promote routing so the new UI is default
- [ ] Monitor health metrics post-switch

### 🟡 PHASE 8: ROLLBACK (READY)
- [ ] Rollback tested
- [ ] Instant rollback procedure documented
- [ ] Monitoring alerts configured

---

## CRITICAL NEXT STEPS

### STEP 1: Update TypeScript backend (15–30 minutes)

Implement shadow routing in the TypeScript backend (the single source of truth for production).

**Targets:**
- `POST /__aion_shadow/api/*` → proxy to Python FastAPI (typically `http://localhost:8000`, path-rewritten to `/api/v1/*`)
- `GET /__aion_shadow/ui/*` → serve the new React build output (`frontend/dist`)

**Reference:** `backend/SHADOW_ROUTING_IMPLEMENTATION.md`

### STEP 2: Build Frontend (5 minutes)

```bash
cd frontend
npm install
npm run build
```

### STEP 3: Verify Python Dependencies (2 minutes)

Ensure `backend/python_backend/requirements.txt` exists and contains the required packages (at minimum):

```
fastapi
uvicorn
aiohttp
python-dotenv
```

### STEP 4: Push to Main (1 minute)

```bash
git add .
git commit -m "feat: complete shadow routing implementation"
git push origin main
```

GitHub Actions should:
1. Build the Node/TypeScript backend
2. Build the React frontend
3. Deploy to Elastic Beanstalk
4. Start Python FastAPI on port 8000 (via EB hooks)

### STEP 5: Test Shadow Paths (5–10 minutes)

```bash
# Test Python backend via shadow proxy
curl https://yourdomain.com/__aion_shadow/api/health

# Test new UI (in browser)
https://yourdomain.com/__aion_shadow/ui

# Test streaming chat
curl -X POST https://yourdomain.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### STEP 6: Promote (controlled cutover)

After shadow tests pass, promote by updating routing behavior in the TypeScript backend (and/or its environment configuration) so that:
- `/` serves the new UI build
- `/api/*` routes to the intended backend implementation

Then deploy normally (push to `main` and let EB do a rolling update).

---

## DEPLOYMENT TIMELINE

| Phase | Status | Estimated Time | Owner |
|-------|--------|----------------|-------|
| Infrastructure Setup | ✅ Complete | 4 hours | DevOps |
| Python Backend Dev | ✅ Complete | 8 hours | Backend Dev |
| Shadow Routing Config | 🟡 In Progress | 0.5–1 hour | Full Stack |
| Frontend Build | ⏳ Pending | 0.2 hours | Frontend |
| Shadow Testing | ⏳ Pending | 1 hour | QA |
| Promotion | ⏳ Pending | 0.2 hours | Full Stack |
| Monitoring | ⏳ Pending | Ongoing | DevOps |

---

## ROLLBACK PROCEDURE

If anything breaks after promotion:

- Preferred: Elastic Beanstalk “Deploy previous version” (fastest).
- Alternative: revert the offending commit and redeploy via CI.

---

## KEY FILES

| File | Purpose |
|------|----------|
| `backend/.ebextensions/03-python-backend.config` | Starts Python on port 8000 during deployment |
| `backend/SHADOW_ROUTING_IMPLEMENTATION.md` | Shadow routing implementation guide |
| `backend/src/*` | TypeScript backend source of truth |
| `frontend/dist` | React production build output |

---

## SUCCESS CRITERIA

✅ Production never goes down
✅ Users experience zero downtime
✅ Users refresh browser to see new UI
✅ Streaming chat works from Python backend
✅ Instant rollback if needed
✅ No broken UI or backend
✅ No partial deployments
