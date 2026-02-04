# AION v1 - Quick Action Guide

Simple step-by-step guide to review, test, merge, and deploy.

---

## Where you are right now

- Backend fixes integrated.
- Docs updated for the TypeScript backend.

Next: Review → Test → Merge → Deploy.

---

## What to do next (30 minutes)

### Step 1: Review the changes (5 minutes)

1. Open your Pull Request in GitHub.
2. Review the description and changed files.
3. If present, scan `PRODUCTION_FIXES_AUDIT.md` for what changed.

---

### Step 2: Test locally (15 minutes)

```bash
# Clone/Update your repo
cd /path/to/AION-v1
git fetch origin
# checkout your working branch

# Terminal 1 - Python backend (optional, only if you're running FastAPI)
cd backend/python_backend
pip install -r requirements.txt
export OPENAI_API_KEY="<your-api-key>"
export NODE_ENV="development"
uvicorn main:app --reload --port 8000

# Terminal 2 - Node.js backend (TypeScript build output → dist/app.js)
cd backend
npm install

# Required env
export OPENAI_API_KEY="<your-api-key>"
export FRONTEND_URL="http://localhost:5173"
export JWT_SECRET="<generate-a-strong-secret>"

# Optional env
export NODE_ENV="development"
export PORT=5000

npm run build
npm start

# Terminal 3 - Test endpoints
curl http://localhost:8000/health                       # Python health
curl http://localhost:5000/health                       # Node health
curl http://localhost:5000/__aion_shadow/api/health      # Shadow proxy test (if enabled)

# Test real AI (Python)
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! Are you working?"}'
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Expected results:

- Health checks return 200 OK.
- `/ready` shows provider connectivity when enabled.
- Chat streaming works where applicable.

---

### Step 3: Merge the PR (2 minutes)

Option A (GitHub): Merge pull request → Confirm.

Option B (CLI):

```bash
git checkout main
git merge <your-branch>
git push origin main
```

---

### Step 4: Deploy to AWS (5 minutes)

Set environment variables first (Elastic Beanstalk → Configuration → Software → Environment properties):

```
OPENAI_API_KEY=<your-api-key>
JWT_SECRET=<your-jwt-secret>
NODE_ENV=production
FRONTEND_URL=https://<your-frontend-domain>
PORT=5000

# Optional shadow proxy env (names depend on backend/src/config/env.ts)
# SHADOW_ENABLED=true
# SHADOW_TARGET=http://localhost:8000
```

Deploy: GitHub Actions deploys on merge to `main`.

Monitor deployments: [Actions](https://github.com/rajeevrajora77-lab/AION-v1/actions)

---

### Step 5: Verify production (3 minutes)

```bash
export DOMAIN="<your-env.elasticbeanstalk.com>"

curl https://$DOMAIN/health
curl https://$DOMAIN/ready
curl https://$DOMAIN/__aion_shadow/api/health

curl -X POST https://$DOMAIN/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello production!"}'
```

---

## If something goes wrong

Rollback (fast):

```bash
git checkout main
git revert HEAD
git push origin main
```

---

## What changed (quick reference)

| Area | What changed | Why |
|------|--------------|-----|
| Python backend (`backend/python_backend/*`) | Hardened CORS + real provider calls + real health checks | Security + correctness |
| Node backend (`backend/src/*`) | Production entrypoint is `node dist/app.js` (via `npm start`) | Predictable deploy + no runtime TS |
| Shadow routing | Config-driven shadow proxy in TS backend (no `server.js` edits) | Safer deployments |

---

*Last updated: February 4, 2026*
