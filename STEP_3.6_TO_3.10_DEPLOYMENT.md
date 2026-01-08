# STEP 3.6 to 3.10 — AION-v1 Backend Deployment on EC2

## Status: GATE 3 Backend Deployment Continuation
**Date**: January 8, 2026  
**Instance**: aion-backend-prod (i-0a1d36c613dd0dca1)  
**IP**: 13.127.135.100  
**Region**: ap-south-1 (Mumbai)  

---

## STEP 3.6 — Clone Backend Repository

```bash
# SSH into EC2 (already completed locally)
ssh -i aion-backend-key.pem ec2-user@13.127.135.100

# Navigate to home directory
cd ~

# Clone the AION-v1 repository
git clone https://github.com/rajeevrajora77-lab/AION-v1.git

# Navigate to backend directory
cd AION-v1/backend

# Install dependencies
npm install

# Verify installation
ls -la
node -v
npm -v
```

**Expected Output**:  
- Node modules installed in `node_modules/`
- node >= v18.x
- npm >= 9.x

---

## STEP 3.7 — Create Production .env File

```bash
# Create .env file in backend directory
cat > ~/.ssh/aion.env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration (MongoDB Atlas)
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/aion?retryWrites=true&w=majority

# AI API Keys
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Search API
SERPAPI_KEY=your-serpapi-key-or-bing-key
BING_API_KEY=your-bing-search-key-optional
BING_SUBSCRIPTION_KEY=your-bing-subscription-key

# CORS Configuration
FRONTEND_URL=https://rajora.co.in
ALLOWED_ORIGINS=https://rajora.co.in,https://www.rajora.co.in,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_ENABLE=true

# Voice Processing
VOICE_PROCESSING_ENABLED=true
WEB_SPEECH_API_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Cache Settings
CACHE_TTL=3600
CACHE_ENABLE=true

# Security
JWT_SECRET=your-secure-jwt-secret-key-min-32-chars
JWT_EXPIRY=7d
CORS_ENABLE=true
HELMET_ENABLE=true
EOF

# Copy .env to the correct location
cp ~/.ssh/aion.env /home/ec2-user/AION-v1/backend/.env

# Set correct permissions
chmod 600 /home/ec2-user/AION-v1/backend/.env

# Verify .env file is in place
ls -la /home/ec2-user/AION-v1/backend/.env
```

**CRITICAL**: Replace all placeholder values with real credentials:
- `MONGODB_URI` - from MongoDB Atlas
- `OPENAI_API_KEY` - from OpenAI dashboard
- `SERPAPI_KEY` or `BING_API_KEY` - for search functionality
- `JWT_SECRET` - generate a secure random string
- `FRONTEND_URL` - must be `https://rajora.co.in`

---

## STEP 3.8 — Start Backend with PM2

```bash
# Navigate to backend directory
cd /home/ec2-user/AION-v1/backend

# Install PM2 globally
sudo npm install -g pm2

# Start the backend application
pm2 start server.js --name aion-backend

# Save PM2 configuration for auto-restart
pm2 save

# Configure PM2 to start on system reboot
sudo pm2 startup

# Verify backend is running
pm2 list

# Check logs
pm2 logs aion-backend

# Test local health endpoint
curl http://localhost:5000/health
```

**Expected Output**:  
```json
{
  "status": "OK",
  "timestamp": "2026-01-08T19:45:00Z",
  "uptime": 45.32,
  "environment": "production",
  "version": "1.0.0"
}
```

**If backend won't start**:
```bash
# Check detailed logs
pm2 logs aion-backend --lines 100

# Check if port 5000 is already in use
sudo lsof -i :5000

# Kill any process using port 5000
sudo kill -9 <PID>

# Restart PM2 app
pm2 restart aion-backend
```

---

## STEP 3.9 — Fix ALB Health Checks

```bash
# The ALB is configured to check: /health endpoint
# Verify the backend responds correctly

curl -v http://localhost:5000/health

# Check if server is listening on 0.0.0.0:5000
sudo netstat -tlnp | grep 5000

# OR using ss command (newer systems)
sudo ss -tlnp | grep 5000
```

**Expected**: Port 5000 is LISTENING on 0.0.0.0

**AWS ALB Target Group Status Check**:  
1. Go to EC2 → Target Groups → aion-backend-tg
2. Click "Targets" tab
3. Check instance status:
   - **Healthy** (green) = ✅ Backend responding correctly
   - **Unhealthy** (red) = ❌ Health check failing
   - **Draining** (yellow) = Instance is shutting down
4. If Unhealthy:
   - Check security group allows 5000 from ALB
   - Verify `curl http://localhost:5000/health` works
   - Check PM2 logs: `pm2 logs aion-backend`
   - Check MongoDB URI is correct in .env

---

## STEP 3.10 — Verify API Endpoint

```bash
# Test health endpoint (should work immediately)
curl https://api.rajora.co.in/health

# Expected response:
# {"status":"OK", ...}

# Test chat endpoint
curl -X POST https://api.rajora.co.in/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello", "sessionId": "test"}'

# Test search endpoint
curl -X POST https://api.rajora.co.in/api/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "AI"}'

# Test voice endpoint
curl -X POST https://api.rajora.co.in/api/voice/process \\
  -H "Content-Type: application/json" \\
  -d '{"transcript": "Hello world", "sessionId": "test"}'
```

### **Troubleshooting API**:

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | ALB can't reach backend. Check PM2 status and security groups |
| 504 Gateway Timeout | Backend taking too long. Check MongoDB connection |
| 403 Forbidden | CORS issue. Verify FRONTEND_URL in .env |
| 401 Unauthorized | Missing JWT token. Check auth middleware |
| Empty response | API responding but empty body. Check request format |

---

## Verification Checklist

✅ **STEP 3.6 Complete?**
- [ ] Git clone successful
- [ ] npm install completed
- [ ] node -v shows v18+
- [ ] npm -v shows v9+

✅ **STEP 3.7 Complete?**
- [ ] .env file created with all values
- [ ] File exists: `/home/ec2-user/AION-v1/backend/.env`
- [ ] MongoDB URI is accessible
- [ ] OpenAI key is valid

✅ **STEP 3.8 Complete?**
- [ ] PM2 shows aion-backend as online
- [ ] `curl http://localhost:5000/health` returns OK
- [ ] PM2 startup configured

✅ **STEP 3.9 Complete?**
- [ ] Target group shows instance as HEALTHY
- [ ] Port 5000 is LISTENING on 0.0.0.0
- [ ] Security group allows inbound on 5000

✅ **STEP 3.10 Complete?**
- [ ] `curl https://api.rajora.co.in/health` returns 200
- [ ] Chat API endpoint responds
- [ ] Search API endpoint responds
- [ ] Voice API endpoint responds

---

## When Everything Works ✅

```
GATE 3 — BACKEND DEPLOYMENT COMPLETE

✅ EC2 Instance: Running (aion-backend-prod)
✅ Application: Online (Node.js + Express)
✅ Load Balancer: Healthy targets
✅ DNS: api.rajora.co.in → ALB
✅ API: Responding to requests
✅ Frontend: Ready to call backend

→ GATE 4 (LIVE PRODUCTION VERIFICATION) ready to proceed
```

---

## Emergency Restart

If backend crashes:

```bash
# SSH into instance
ssh -i aion-backend-key.pem ec2-user@13.127.135.100

# Navigate to backend
cd ~/AION-v1/backend

# Restart PM2 app
pm2 restart aion-backend

# Or start if it was stopped
pm2 start server.js --name aion-backend

# Verify it's running
pm2 list
process.memory = 45.6 MB
process.cpu = 0.1%
```

---

**Status**: Ready for automated completion ✅
