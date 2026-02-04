# AION v1 Zero-Downtime Deployment Status

**Last Updated**: Feb 4, 2026
**Status**: 🟡 IN PROGRESS - Code integrated, docs cleanup ongoing

## MISSION
Make the new AION UI (Python FastAPI backend + React frontend) live on production without downtime using shadow routing and a controlled cutover.

---

## COMPLETION CHECKLIST

### ✅ PHASE 1-4: INFRASTRUCTURE & CONFIGURATION
- [x] Elastic Beanstalk environment established and healthy
- [x] Node.js backend stable and running
- [x] GitHub Actions CI/CD pipeline working
- [x] Health check endpoints (`/health`, `/ready`) configured
- [x] Procfile configured: `web: npm run build && npm run start`
- [x] `.ebextensions/03-python-backend.config` created for Python startup
- [x] `http-proxy-middleware` available for shadow proxy
- [x] Shadow routing supported in `backend/src/app.ts` (env-driven enable/target)

### 🟡 PHASE 5: CODE INTEGRATION (IN PROGRESS)

**COMPLETED:**
- [x] TypeScript layered backend in place (`backend/src/*`)
- [x] Production entrypoint standardized: `npm start` → `node dist/app.js`
- [x] Deployment workflow updated to stop writing/committing `backend/server.js`

**REMAINING:**
- [ ] Build frontend UI (`npm run build` in frontend folder)
- [ ] Verify Python FastAPI requirements.txt exists in `backend/python_backend/`
- [ ] Enable shadow paths via environment configuration (see `backend/src/config/env.ts`)
- [ ] Test shadow paths before cutover

### 🟡 PHASE 6-7: TESTING & GO-LIVE (NOT STARTED)
- [ ] Shadow testing on `/__aion_shadow/ui` and `/__aion_shadow/api`
- [ ] Verify streaming works without CDN buffering
- [ ] Load testing with concurrent users
- [ ] Controlled routing switch to make new UI default (config + deploy)
- [ ] Monitor health metrics post-switch

---

## CRITICAL NEXT STEPS

### STEP 1: Enable shadow API proxy (env-driven)
Shadow proxy support is already implemented in the TS backend (`backend/src/app.ts`).

Action:
- Set the required shadow env vars in your deployment environment (see `backend/src/config/env.ts` for exact names).
- Ensure the target points to your Python service (commonly `http://localhost:8000`).

### STEP 2: Build Frontend (5 minutes)

```bash
cd frontend
npm install
npm run build
```

### STEP 3: Verify Python Dependencies (2 minutes)

Ensure `backend/python_backend/requirements.txt` exists and contains your required packages (example):
```
fastapi
uvicorn
aiohttp
python-dotenv
```

### STEP 4: Deploy (standard)

```bash
git add .
git commit -m "feat: enable shadow routing + deploy"
git push origin main
```

EB will roll instances (zero downtime) and pick up the latest backend build/start (`node dist/app.js`).

### STEP 5: Test Shadow Paths (5 minutes)

```bash
# Test Node health
curl https://yourdomain.com/health

# Test shadow API health
curl https://yourdomain.com/__aion_shadow/api/health

# Test streaming chat (shadow)
curl -X POST https://yourdomain.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

---

## ROLLBACK PROCEDURE

Preferred rollback in production:
- Use Elastic Beanstalk “Deploy previous version” (fastest), or
- Revert the offending commit and redeploy.

---

## KEY FILES

| File | Purpose |
|------|----------|
| `backend/src/app.ts` | Backend app + optional shadow proxy + bootstrap entrypoint |
| `backend/package.json` | `npm start` runs `node dist/app.js` |
| `backend/.ebextensions/03-python-backend.config` | Starts Python on port 8000 during deployment |
| `.github/workflows/aion-v1-zero-downtime-deploy.yml` | Health checks + monitoring (no code mutation) |
