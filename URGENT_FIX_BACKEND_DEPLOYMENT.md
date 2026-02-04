# 🚨 URGENT: Backend Deployment Fix for rajora.co.in

## 🔴 CRITICAL ISSUE

**Your website rajora.co.in is showing "Error: Failed to fetch" because:**

1. ✅ **Frontend is deployed** (S3 + CloudFront)
2. ❌ **Backend is NOT deployed** anywhere
3. ❌ Frontend is trying to connect to `http://localhost:5000/api` which doesn't exist in production

---

## 🛠️ IMMEDIATE FIX - Deploy Backend to Railway (5 Minutes)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway

### Step 2: Deploy Backend

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend
cd backend

# Initialize Railway project
railway init

# Deploy
railway up
```

### Step 3: Set Environment Variables in Railway

In Railway Dashboard:
1. Go to your project
2. Click "Variables"
3. Add these (use placeholders; never commit secrets):

```bash
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=your-mongodb-atlas-uri

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000

# Search API (choose one)
BING_API_KEY=your-bing-api-key
# OR
SERPAPI_KEY=your-serpapi-key

# CORS / Frontend origin
FRONTEND_URL=https://rajora.co.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Shadow proxy (if using Python FastAPI alongside Node)
# See backend/src/config/env.ts for the exact env var names expected
# SHADOW_ENABLED=true
# SHADOW_TARGET=http://localhost:8000
```

### Step 4: Get Your Backend URL

Railway will give you a URL like:
```
https://aion-backend-production.up.railway.app
```

### Step 5: Update Frontend Configuration

**Option A: Quick Fix (Update build and redeploy)**

1. Edit `frontend/.env.production`:
```bash
VITE_API_URL=https://aion-backend-production.up.railway.app/api
```

2. Rebuild frontend:
```bash
cd frontend
npm run build
```

3. Deploy to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

**Option B: Runtime Configuration (Better)**

Update `frontend/src/services/api.js` to:
```javascript
const API_BASE_URL = 
  window.RUNTIME_API_URL || 
  import.meta.env.VITE_API_URL || 
  'https://aion-backend-production.up.railway.app/api';
```

---

## 🚀 ALTERNATIVE: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click "New" → "Web Service"
2. Connect GitHub repository: `rajeevrajora77-lab/AION-v1`
3. Select `backend` directory
4. Settings:
   - **Name**: aion-backend
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start` (runs `node dist/app.js`)
   - **Plan**: Free

### Step 3: Add Environment Variables
(Same as Railway above)

### Step 4: Deploy
Click "Create Web Service" - Render will auto-deploy

Your URL will be:
```
https://aion-backend.onrender.com
```

---

## ⚙️ Fix Backend Configuration for Production

### CORS
CORS is configured in the TypeScript backend and should be controlled via environment-driven config (see `backend/src/config/*` and `backend/src/app.ts`).

### Update `backend/.env` (local example)

```bash
# Server
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aion

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# CORS
FRONTEND_URL=https://rajora.co.in
```

---

## 🧪 Test Your Fix

### 1. Test Backend Health
```bash
curl https://your-backend-url.railway.app/health
```

Expected response:
```json
{"status":"OK","timestamp":"..."}
```

### 2. Test Chat Endpoint
```bash
curl -X POST https://your-backend-url.railway.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

### 3. Test Search Endpoint
```bash
curl -X POST https://your-backend-url.railway.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"AI"}'
```

### 4. Test Website
1. Go to https://rajora.co.in
2. Try sending a chat message
3. Try using search

Should work without "Error: Failed to fetch"

---

## 📄 Complete Deployment Checklist

- [ ] Backend deployed to Railway/Render
- [ ] Environment variables configured
- [ ] MongoDB connection working
- [ ] OpenAI API key configured
- [ ] CORS configured for rajora.co.in
- [ ] Backend URL obtained
- [ ] Frontend `.env.production` updated with backend URL
- [ ] Frontend rebuilt
- [ ] Frontend redeployed to S3
- [ ] CloudFront cache invalidated
- [ ] Website tested and working

---

## 🐛 Troubleshooting

### Issue: "CORS Error"
**Solution**: Check your backend CORS-related environment variables (and confirm the frontend origin matches exactly).

### Issue: "MongoDB Connection Error"
**Solution**: 
1. Use MongoDB Atlas (cloud)
2. Whitelist Railway/Render IP addresses
3. Or use `0.0.0.0/0` for testing

### Issue: "OpenAI API Error"
**Solution**: Verify your API key is valid and has credits

### Issue: "502 Bad Gateway"
**Solution**: Backend crashed - check Railway/Render logs

---

## 🔥 FASTEST 5-MINUTE FIX

```bash
# 1. Deploy to Railway
cd backend
npm install -g @railway/cli
railway login
railway init
railway up

# 2. Add OPENAI_API_KEY + MONGODB_URI + FRONTEND_URL in Railway dashboard

# 3. Get your Railway URL (e.g., https://xxx.railway.app)

# 4. Update frontend
cd ../frontend
echo "VITE_API_URL=https://xxx.railway.app/api" > .env.production
npm run build

# 5. Deploy to S3
cd ..
bash scripts/deploy-frontend.sh

# DONE! Test at https://rajora.co.in
```

---

## 🎯 Next Steps After Fix

1. ✅ Set up monitoring (UptimeRobot)
2. ✅ Add SSL certificate (automatic with Railway/Render)
3. ✅ Set up custom domain for backend (api.rajora.co.in)
4. ✅ Enable logging and error tracking
5. ✅ Set up automated backups for MongoDB

---

**STATUS**: 🔴 URGENT - Website currently not functioning
**ACTION**: Deploy backend immediately using steps above
**ETA**: 5-10 minutes to fix
