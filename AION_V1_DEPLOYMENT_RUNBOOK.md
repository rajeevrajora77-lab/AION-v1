# AION v1 Zero-Downtime Deployment Runbook

## Overview

This runbook automates the production deployment of AION v1 with **zero downtime**, **atomic UI + backend switch**, and **instant rollback capability**.

**Current Status**: EB Environment is `Degraded` due to missing IAM EC2 tagging permissions. **FIX FIRST** before deployment.

## Pre-Requisites

- [ ] EB environment: `Aion-backend-env-1` (us-east-1)
- [ ] Domain: `aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com`
- [ ] GitHub Actions secrets configured: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Node backend running (TypeScript build + start)
- [ ] Frontend built: `frontend/dist/` ready to serve
- [ ] Terraform state backend configured (S3 recommended)

## Step 1: Pre-Flight Checks (Manual or Automated)

### Option A: Manual Pre-Flight

```bash
# 1. Check main health endpoint
curl -i https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/health
# Expected: 200 OK

# 2. Check shadow health
curl -i https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/__aion_shadow/api/health
# Expected: 200 OK

# 3. Check shadow ready
curl -i https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/__aion_shadow/api/ready
# Expected: 200 OK

# 4. Test streaming (shadow)
curl -N -X POST https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/__aion_shadow/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: Streaming chunks, NOT a single buffered response
```

---

## Cleanup (After 24-48h Stability)

Once AION v1 has been running stable for 24-48 hours:

```bash
# Remove shadow UI/API endpoints
# (delete all /__aion_shadow/* routes from backend/src/app.ts)

# Cleanup legacy build artifacts
rm -rf old-ui/

# Commit cleanup
git add .
git commit -m "cleanup: remove old AION v0 code and shadow deployment UI"
git push origin main

# Create release tag
git tag -a v1.0.0-live -m "AION v1 production live"
git push origin v1.0.0-live
```

---

## Troubleshooting

### Streaming Returns Buffered Response

**Symptom**: `/api/chat` returns entire response at once (not streaming)

**Solution**:
1. Check Node proxy middleware config in `backend/src/app.ts` (shadow proxy)
2. Check NGINX settings (if reverse proxy)
3. Ensure no gzip compression buffering: `Content-Encoding: identity`

### Production UI Shows Old UI

**Symptom**: After deployment, old UI still visible

**Solution**:
1. Hard refresh browser: `Ctrl+Shift+R` (Chrome) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Verify deployment artifact includes current UI build

---

**Last Updated**: February 4, 2026
