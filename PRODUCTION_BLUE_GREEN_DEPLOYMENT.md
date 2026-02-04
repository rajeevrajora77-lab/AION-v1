# AION v1 — Production Update Strategy
## Zero-Downtime Updates via Elastic Beanstalk

> **Your Request**: Website should NOT go down. When you push updates, users just need to refresh to see changes.
> **Solution**: Your current Elastic Beanstalk (EB) rolling deployments already provide this behavior.

---

## ✅ WHAT YOU ALREADY HAVE (Working Perfectly)

### Current Architecture
```
Users → rajora.co.in → CloudFront/ALB
                            ↓
                    Elastic Beanstalk
                    (Node.js Backend)
                            ↓
                    Multiple Instances
                    (Auto-scaled, Health-checked)
```

### How It Works NOW
1. **You push code** → GitHub Actions triggers
2. **EB deploys** → Rolling deployment (one instance at a time)
3. **Users see old version** → Until they refresh
4. **Users refresh** → Get new version
5. **Zero downtime** → Some users on old, some on new (seamless transition)

---

## 🎯 WHAT YOU ACTUALLY NEED

You want to add:
1. **New Python backend** (alongside current Node.js)
2. **New UI**
3. **Users refresh to see updates**
4. **No downtime**

### Solution: Use Your Current EB + Add Shadow Paths

You can introduce the new backend/UI behind shadow paths first (e.g., `/__aion_shadow/*`) and promote later.

---

## 📐 SIMPLE IMPLEMENTATION (No EC2, No ALB Config)

### Step 1: Add shadow proxy in the TypeScript backend

**File**: `backend/src/app.ts` (UPDATE)

Your TypeScript backend already has the correct place to add shadow routing logic.
Below is an illustrative pattern (ensure target + enablement are environment-driven):

```ts
// Example only (keep it config-driven)
import { createProxyMiddleware } from 'http-proxy-middleware';

// Shadow API endpoint - forwards to Python backend
app.use('/__aion_shadow/api', createProxyMiddleware({
  target: process.env.SHADOW_TARGET || 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/__aion_shadow/api': '/api/v1'
  }
}));
```

### Step 2: Add Python FastAPI backend

**File**: `backend/python_backend/main.py` (NEW)

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

@app.post("/api/v1/chat")
async def chat_stream(request: dict):
    async def generate():
        message = request.get('message', '')
        response = f"Python backend response to: {message}"

        for chunk in response.split():
            yield f"data: {chunk}\n\n"
            await asyncio.sleep(0.1)

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "OK", "backend": "python"}
```

### Step 3: Start command (Elastic Beanstalk)

**File**: `backend/Procfile` (UPDATE)

Use a start command that runs the compiled TypeScript output (no `server.js`):

```
web: npm run build && npm start
```

**Note**: Run the Python FastAPI process using EB hooks/startup scripts (for example via `.ebextensions/*`) so it is running on the instance (typically on port 8000) before the Node shadow proxy forwards traffic.

### Step 4: Update frontend to use shadow API

**File**: `frontend/src/App.jsx` (or your main UI file)

```js
// Change API endpoint
const API_ENDPOINT = '/__aion_shadow/api/v1/chat';

async function handleSend() {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });

  // Your streaming logic (already works!)
}
```

---

## 🚀 DEPLOYMENT PROCESS (Zero Downtime)

### How It Works

1. **Push to GitHub**
```bash
git add .
git commit -m "feat: Add Python shadow backend"
git push origin main
```

2. **GitHub Actions Deploys**
- Builds your code
- Creates deployment package
- Uploads to EB
- EB does **rolling deployment**:
  - Instance 1: Gets new code → Health check → Accepts traffic
  - Instance 2: Gets new code → Health check → Accepts traffic
  - Old instances: Drained gracefully

3. **User Experience**
- Users on site: See old version (no disruption)
- Users refresh: See new version
- No downtime

---

## 📊 MONITORING & ROLLBACK

### Health Monitoring
EB automatically monitors:
- `/health` endpoint
- Response times
- Error rates

If new version fails health checks:
- Deployment stops automatically
- Old version stays live

### Instant Rollback
**AWS Console** → **Elastic Beanstalk** → **Your Environment** → **Actions** → **Deploy Previous Version**

Or via CLI:
```bash
eb deploy --version <previous-version-label>
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Add Shadow Backend
- [ ] Add `http-proxy-middleware` to `backend/package.json`
- [ ] Update `backend/src/app.ts` with shadow proxy
- [ ] Create `backend/python_backend/main.py`
- [ ] Ensure EB startup runs Python (for example via `.ebextensions/*`)
- [ ] Update Procfile to `npm run build && npm start`
- [ ] Deploy to EB
- [ ] Test `/__aion_shadow/api/v1/chat`

### Phase 2: Update Frontend
- [ ] Update API endpoints to shadow paths
- [ ] Test streaming functionality
- [ ] Deploy frontend changes
- [ ] Monitor for errors

### Phase 3: Switch to Primary (When Ready)
- [ ] Promote routing behavior in the TS backend so `/` serves the new UI build
- [ ] Promote `/api/*` routes to the intended backend implementation
- [ ] Remove/retire old paths when stable

---

## 🆘 SUPPORT

If you encounter issues:
1. Check EB logs: `eb logs`
2. Check health: `/__aion_shadow/api/health`
3. Review GitHub Actions logs
4. Check this guide
