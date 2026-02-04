# AION v1 - Quick Action Guide

**🚨 START HERE** - Simple step-by-step guide to review, test, merge, and deploy.

---

## 📍 Where You Are Right Now

✅ **DONE**: Critical backend fixes integrated  
✅ **DONE**: Documentation in place  

🎯 **NEXT**: Review → Test → Merge → Deploy

---

## 🚀 What To Do Next (30 Minutes Total)

### Step 1: Review the Changes (5 minutes)

1. **Open your Pull Request**:
   - Go to your PR in GitHub
   - Read the description
   - Review the file changes

2. **Read the Audit Report (if present)**:
   - Open: `PRODUCTION_FIXES_AUDIT.md`
   - Confirm what was broken and what was fixed

---

### Step 2: Test Locally (15 minutes)

```bash
# Clone/Update your repo
cd /path/to/AION-v1
git fetch origin
# checkout your working branch

# Terminal 1 - Python Backend (optional, only if you're running FastAPI)
cd backend/python_backend
pip install -r requirements.txt
export OPENAI_API_KEY="your-actual-openai-key"
export NODE_ENV="development"
uvicorn main:app --reload --port 8000

# Terminal 2 - Node.js Backend (TypeScript build → dist/app.js)
cd backend
npm install
export OPENAI_API_KEY="your-actual-openai-key"
export FRONTEND_URL="http://localhost:5173"
export NODE_ENV="development"
export PORT=5000
npm run build
npm start

# Terminal 3 - Test Endpoints
curl http://localhost:8000/health     # Python health
curl http://localhost:5000/health     # Node health
curl http://localhost:5000/__aion_shadow/api/health  # Shadow proxy test (if enabled)

# Test Real AI (should stream actual model output if configured):
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! Are you working?"}'
```

**Expected Results**:
- ✅ Health checks return 200 OK
- ✅ `/ready` shows OpenAI (or provider) connectivity when enabled
- ✅ Chat endpoint streams (SSE) where applicable

---

### Step 3: Merge the PR (2 minutes)

**Option A: Via GitHub (Easiest)**
1. Open your PR
2. Click "Merge pull request"
3. Click "Confirm merge"

**Option B: Via Command Line**
```bash
git checkout main
git merge <your-branch>
git push origin main
```

---

### Step 4: Deploy to AWS (5 minutes)

#### Set Environment Variables First

Go to AWS Elastic Beanstalk Console:
1. Select your AION environment
2. Configuration → Software → Edit
3. Add environment properties:

```
OPENAI_API_KEY=sk-your-actual-key-here
NODE_ENV=production
FRONTEND_URL=https://rajora.co.in
PORT=5000

# Optional shadow proxy env (names depend on backend/src/config/env.ts)
# SHADOW_ENABLED=true
# SHADOW_TARGET=http://localhost:8000
```

4. Click "Apply"

#### Deploy

GitHub Actions will automatically deploy when you merge to main.

**Monitor deployment**:
- Actions: https://github.com/rajeevrajora77-lab/AION-v1/actions

---

### Step 5: Verify Production (3 minutes)

```bash
# Replace with your actual EB domain
export DOMAIN="your-env.elasticbeanstalk.com"

# Test health
curl https://$DOMAIN/health

# Test readiness (checks OpenAI/provider connectivity)
curl https://$DOMAIN/ready

# Test shadow API (if enabled)
curl https://$DOMAIN/__aion_shadow/api/health

# Test real AI (shadow)
curl -X POST https://$DOMAIN/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello production!"}'
```

**All tests pass?** You’re live.

---

## 🆘 If Something Goes Wrong

### Rollback Plan (< 2 minutes)

```bash
# Option 1: Revert the merge
git checkout main
git revert HEAD
git push origin main

# GitHub Actions will auto-deploy the rollback
```

---

## 📊 What Changed (Quick Reference)

| Area | What Changed | Why |
|------|--------------|-----|
| Python backend (`backend/python_backend/*`) | Hardened CORS + real provider calls + real health checks | Security + correctness |
| Node backend (`backend/src/*`) | Production entrypoint is `node dist/app.js` (via `npm start`) | Predictable deploy + no runtime TS |
| Shadow routing | Config-driven shadow proxy in TS backend (no `server.js` edits) | Safer deployments |

---

## ✅ Success Checklist

**Before Merging**:
- [ ] Reviewed PR
- [ ] Tested locally (health + chat)
- [ ] Verified no secrets committed

**After Merging**:
- [ ] EB env vars set
- [ ] GitHub Actions deployment succeeded
- [ ] Production health checks pass

---

## 🎯 Commands at a Glance

```bash
# Quick Test Suite
curl https://your-domain.com/health
curl https://your-domain.com/ready
curl https://your-domain.com/__aion_shadow/api/health

# Test Real AI (shadow)
curl -X POST https://your-domain.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# Check Logs
eb logs  # If using EB CLI
```

---

*Last updated: February 4, 2026*  
