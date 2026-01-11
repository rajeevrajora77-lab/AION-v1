# AION v1 Zero-Downtime Deployment Status

**Last Updated**: Jan 12, 2026, 12:30 AM IST
**Status**: 🟡 IN PROGRESS - Infrastructure Ready, Awaiting Code Integration

## MISSION
Make the new AION UI (Python FastAPI backend + React frontend) live on production without downtime using shadow routing and atomic switching.

---

## COMPLETION CHECKLIST

### ✅ PHASE 1-4: INFRASTRUCTURE & CONFIGURATION
- [x] Elastic Beanstalk environment established and healthy
- [x] Node.js backend stable and running  
- [x] GitHub Actions CI/CD pipeline working
- [x] Python FastAPI backend created and tested
- [x] Streaming endpoints (SSE) implemented
- [x] Health check endpoints (/health, /ready) configured
- [x] Procfile configured: `web: node server.js`
- [x] `.ebextensions/03-python-backend.config` created for Python startup
- [x] `http-proxy-middleware` added to dependencies
- [x] Shadow routing architecture designed and documented

### 🟡 PHASE 5: CODE INTEGRATION (IN PROGRESS)
**Status**: 50% Complete

**COMPLETED:**
- [x] Added `http-proxy-middleware@^2.0.6` to package.json
- [x] Created comprehensive implementation guide at `backend/SHADOW_ROUTING_IMPLEMENTATION.md`
- [x] Configured Python startup via `.ebextensions/03-python-backend.config`

**REMAINING:**
- [ ] Update `backend/server.js` - Add 3 code changes (see below)
- [ ] Build frontend UI (`npm run build` in frontend folder)
- [ ] Verify Python FastAPI requirements.txt exists in `backend/python_backend/`
- [ ] Test shadow paths before atomic switch

### 🟡 PHASE 6-7: TESTING & GO-LIVE (NOT STARTED)
- [ ] Shadow testing on `/__aion_shadow/ui` and `/__aion_shadow/api`
- [ ] Verify streaming works without CDN buffering
- [ ] Load testing with concurrent users
- [ ] Atomic routing switch to make new UI default
- [ ] Monitor health metrics post-switch

### 🟡 PHASE 8: ROLLBACK (READY)
- [ ] Rollback tested locally
- [ ] Instant rollback procedure documented
- [ ] Monitoring alerts configured

---

## CRITICAL NEXT STEPS

### STEP 1: Update server.js (15 minutes)

Add these three code snippets to `backend/server.js`:

```javascript
// AFTER line 1 (first import)
import { createProxyMiddleware } from 'http-proxy-middleware';

// AFTER request logger middleware (around line 42)
app.use('/__aion_shadow/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: { '^/__aion_shadow/api': '' },
  onError: (err, req, res) => {
    console.warn('Shadow API proxy:', err.message);
    res.status(503).json({error: 'Unavailable'});
  }
}));

// AFTER the shadow proxy, before existing API routes
app.use('/__aion_shadow/ui', express.static('frontend/dist'));
```

**See**: `backend/SHADOW_ROUTING_IMPLEMENTATION.md` for complete implementation details.

### STEP 2: Build Frontend (5 minutes)

```bash
cd frontend
npm install
npm run build
```

### STEP 3: Verify Python Dependencies (2 minutes)

Ensure `backend/python_backend/requirements.txt` exists and contains:
```
fastapi
uvicorn
aiohttp
python-dotenv
```

### STEP 4: Push to Main (1 minute)

```bash
git add .
git commit -m "feat: Complete shadow routing implementation for atomic deployment"
git push origin main
```

GitHub Actions will automatically:
1. Build Node backend
2. Build React frontend  
3. Deploy to Elastic Beanstalk
4. Start Python FastAPI on port 8000

### STEP 5: Test Shadow Paths (5 minutes)

```bash
# Test Python backend
curl https://yourdomain.com/__aion_shadow/api/health

# Test new UI (in browser)
Visit https://yourdomain.com/__aion_shadow/ui

# Test streaming chat
curl -X POST https://yourdomain.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

### STEP 6: Execute Atomic Switch (2 minutes)

Once shadow testing passes, update `server.js` to make new UI the default:

```javascript
// Change this line (OLD - routes to old UI)
app.use('/', express.static('old-ui/dist'));

// To this (NEW - routes to new UI)
app.use('/', express.static('frontend/dist'));

// Change this (OLD - routes Node chat logic)  
app.use('/api/chat', chatRoutes);

// To this (NEW - routes Python chat logic)
app.use('/api/chat', createProxyMiddleware({
  target: 'http://localhost:8000/api/v1/chat',
  changeOrigin: true
}));
```

---

## DEPLOYMENT TIMELINE

| Phase | Status | Estimated Time | Owner |
|-------|--------|----------------|-------|
| Infrastructure Setup | ✅ Complete | 4 hours | DevOps |
| Python Backend Dev | ✅ Complete | 8 hours | Backend Dev |
| Shadow Routing Config | 🟡 In Progress | 0.5 hours | Full Stack |
| Code Integration | 🟡 Pending | 0.5 hours | Full Stack |
| Frontend Build | ⏳ Pending | 0.2 hours | Frontend |
| Shadow Testing | ⏳ Pending | 1 hour | QA |
| Atomic Switch | ⏳ Pending | 0.1 hours | DevOps |
| Monitoring | ⏳ Pending | Ongoing | DevOps |

**Total Remaining**: ~2.3 hours until production go-live

---

## ROLLBACK PROCEDURE

If anything breaks after the atomic switch:

```bash
# 1. SSH into EB instance
eb ssh

# 2. Revert the deployment
cd /var/app/current
git log --oneline | head -5
git revert <commit-hash-of-switch>

# 3. Restart server (automatic)
```

**Rollback time**: < 30 seconds

---

## KEY FILES CREATED

| File | Purpose |
|------|----------|
| `backend/.ebextensions/03-python-backend.config` | Starts Python on port 8000 during deployment |
| `backend/package.json` | Added http-proxy-middleware dependency |
| `backend/SHADOW_ROUTING_IMPLEMENTATION.md` | Complete implementation guide |
| (Pending) `backend/server.js` updates | Adds proxy routes and UI serving |

---

## ARCHITECTURE SUMMARY

```
User Browser Request
         ↓
Domain: yourdomain.com
         ↓
Elastic Beanstalk ALB (Port 443 HTTPS)
         ↓
Node.js Server (Port 3000 internally)
   ├─ BLUE (Current):
   │  ├─ GET /          → Old UI
   │  ├─ POST /api/chat → Node.js OpenAI logic
   │  └─ GET /health    → Node health check
   │
   ├─ GREEN (Shadow - Concurrent):
   │  ├─ GET /__aion_shadow/ui       → New AION React UI
   │  ├─ POST /__aion_shadow/api/*   → [Proxied to Python]
   │  └─ GET /__aion_shadow/health   → Python health check
   │
   └─ Worker Process:
      └─ Python FastAPI (Port 8000)
         └─ POST /api/v1/chat (SSE streaming)
```

---

## SUCCESS CRITERIA

✅ Production never goes down  
✅ Users experience zero downtime  
✅ Users refresh browser to see new UI  
✅ Streaming chat works from Python backend  
✅ Instant rollback if needed  
✅ No broken UI or backend  
✅ No partial deployments  

---

## CONTACT & SUPPORT

- **CTO**: Rajiv Rajora (rajeevrajora77@gmail.com)
- **DevOps**: Elastic Beanstalk team
- **Status Page**: https://github.com/rajeevrajora77-lab/AION-v1/pulse
- **Monitoring**: CloudWatch + EB Health Dashboard
