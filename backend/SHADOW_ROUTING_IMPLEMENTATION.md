# AION v1 Shadow Routing Implementation Guide

This document describes the complete implementation of shadow routing and blue-green deployment for AION v1.

## COMPLETED STEPS

✅ Created `.ebextensions/03-python-backend.config` to start Python FastAPI on port 8000 alongside Node.js
✅ Added `http-proxy-middleware` to package.json for request proxying
✅ Procfile configured correctly: `web: node server.js`
✅ Elastic Beanstalk configuration files created

## NEXT STEPS - ADD TO server.js

### 1. Import http-proxy-middleware (Add after line 1)
```javascript
import { createProxyMiddleware } from 'http-proxy-middleware';
```

### 2. Add Shadow Proxy Route (Add after request logger middleware, before API Routes section)
```javascript
// Shadow proxy for Python FastAPI backend
app.use('/__aion_shadow/api', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/__aion_shadow/api': '',
  },
  onError: (err, req, res) => {
    console.warn('Shadow API proxy error:', err.message);
    res.status(503).json({error: 'Shadow API unavailable'});
  }
}));
```

### 3. Add UI Serving Route (Add after the shadow proxy, before existing API routes)
```javascript
// Serve new AION UI from shadow path
app.use('/__aion_shadow/ui', express.static('frontend/dist'));
```

## DEPLOYMENT STEPS

1. **Update server.js** with the above changes
2. **Build frontend UI** (if not built)
3. **Push changes** to main branch
4. **GitHub Actions** will:
   - Build Node backend
   - Build UI
   - Deploy to Elastic Beanstalk
5. **Test shadow paths** before atomic switch

## TESTING SHADOW DEPLOYMENT

```bash
# Test Python backend
curl https://yourdomain.com/__aion_shadow/api/health

# Test new UI
Visit https://yourdomain.com/__aion_shadow/ui in browser

# Test streaming chat
curl -X POST https://yourdomain.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## ATOMIC SWITCH (GO-LIVE)

Once testing is successful, execute the atomic switch:

1. **Update routing in server.js**:
   - Change `/` to serve new UI instead of old UI
   - Change `/api` to route to Python instead of Node
2. **Test public endpoints**
3. **Monitor health metrics**

## ROLLBACK

If anything fails:
```bash
cd /var/app/current
git revert <commit-hash>
npm start  # Server restarts automatically
```

## ARCHITECTURE

```
Users
  ↓
Domain (yourdomain.com)
  ↓
Elastic Beanstalk Load Balancer
  ↓
Node.js Server (Port 3000 internally)
  ├─ CURRENT STATE:
  │  ├─ / → Old React UI
  │  └─ /api → Node.js chat logic
  │
  └─ SHADOW STATE (concurrent):
     ├─ /__aion_shadow/ui → New AION UI
     └─ /__aion_shadow/api → Python FastAPI (Port 8000)

Python FastAPI (Port 8000)
  └─ /api/v1/chat → Streaming chat with OpenAI
```

## CRITICAL NOTES

1. **Python dependencies** installed via `03-python-backend.config`
2. **No database migration** needed - old and new systems can coexist
3. **Users experience zero downtime** - they refresh to see new UI
4. **Instant rollback** - just revert the commit
5. **Health checks** configured for both systems
