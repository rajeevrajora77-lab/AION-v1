# AION v1 Zero-Downtime Deployment Runbook

## Overview

This runbook automates the production deployment of AION v1 with **zero downtime**, **atomic UI + backend switch**, and **instant rollback capability**.

**Current Status**: EB Environment is `Degraded` due to missing IAM EC2 tagging permissions. **FIX FIRST** before deployment.

## Pre-Requisites

- [ ] EB environment: `Aion-backend-env-1` (us-east-1)
- [ ] Domain: `aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com`
- [ ] GitHub Actions secrets configured: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Python backend running on `localhost:8000` inside EB EC2 instance
- [ ] Frontend built: `frontend/dist/` ready to serve
- [ ] Terraform state backend configured (S3 recommended)

## Step 0: FIX EB IAM PERMISSIONS (One-time)

### Issue
EB deployment fails with error:
```
Stack named 'awseb-e-x6wyemjyau-immutable-stack' aborted operation.
Reason: The following resource(s) failed to create: [AWSEBEIP].
Creating EIP failed: Resource handler returned message: "Encountered a permissions error"
```

### Solution: Apply Terraform Fix

```bash
# 1. Navigate to terraform directory
cd terraform/

# 2. Initialize Terraform (if not done)
terraform init

# 3. Plan the changes
terraform plan

# 4. Apply the IAM fix
terraform apply

# Expected Output:
# aws_iam_role_policy.eb_ec2_tag_policy: Creation complete
# aws_iam_role_policy.eb_ec2_policy: Creation complete
```

### Verify Fix

```bash
# Check IAM role has the new policies attached
aws iam list-role-policies --role-name aws-elasticbeanstalk-service-role

# Expected output includes:
# ElasticBeanstalk-EC2-Tagging
# ElasticBeanstalk-EC2-Basic
```

Once applied, EB should return to **Green** health within 2-3 minutes.

---

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

### Option B: Automated Pre-Flight (GitHub Actions)

Go to: **GitHub → Actions → AION v1 Zero-Downtime Deployment**

1. Click `Run workflow`
2. Select: `Environment: shadow-test`
3. Click `Run`
4. Wait for pre-flight job to complete (should pass all checks)

If any check fails → **STOP** and fix the issue before proceeding.

---

## Step 2: Trigger Production Atomic Switch

### Via GitHub Actions (Recommended)

1. Go to: **GitHub Repo → Actions**
2. Select: **"AION v1 Zero-Downtime Deployment"** workflow
3. Click **"Run workflow"** button
4. In dropdown, select: **`environment: production`**
5. Click **"Run workflow"**

**What happens next (automated)**:

- ✅ Pre-flight checks run (all endpoints verified)
- ✅ If pre-flight passes → atomic switch commits + pushes to `main`
- ✅ GitHub Actions builds and deploys to EB
- ✅ Monitors EB health (waits for Green)
- ✅ Post-deployment smoke tests run
- ✅ If any failure → **automatic rollback** is triggered

### Expected Timeline

- Pre-flight checks: **2-3 minutes**
- Atomic switch commit: **<1 minute**
- EB deployment (rollout): **5-10 minutes**
- Health monitoring: **up to 10 minutes** (configurable)
- Post-switch verification: **2-3 minutes**
- **Total: 15-25 minutes** (worst case)

---

## Step 3: Monitor Deployment (Real-Time)

### In GitHub Actions

1. Go to the running workflow
2. Watch each job stage:
   - `preflight` → `atomic_switch` → `deployment_monitor` → `post_switch_verification`
3. Check logs for any errors

### In AWS Elastic Beanstalk Console

1. Go to: **AWS Console → Elastic Beanstalk → Aion-backend-env-1**
2. Watch **Health** tab:
   - Expect: Green → Yellow (during deploy) → Green (final)
   - If Red → check Events and Logs immediately
3. Check **Events** tab for deployment status messages
4. Check **Logs** for any application errors

### In Production

1. **Open main domain** in browser: `https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/`
   - Should see NEW AION UI (not old UI)
   - Chat input should be visible
   - Sidebar present

2. **Test chat streaming**:
   ```bash
   curl -N -X POST https://aion-backend-env-1.eba-4uswimrs.us-east-1.elasticbeanstalk.com/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"production test"}'
   ```
   - Should stream chunks in real-time

---

## Step 4: Post-Deployment Validation (30 minutes)

After deployment completes and health is Green:

### Real User Simulation Tests

1. **Desktop browser**:
   - Send multiple messages rapidly
   - Check latency (should be <2s)
   - Check UI responsiveness

2. **Mobile browser**:
   - Load page on mobile
   - Send messages
   - Test rotation

3. **Multiple tabs**:
   - Open 2-3 tabs of the app
   - Send messages in parallel
   - Check message order and consistency

4. **Slow network simulation**:
   - In DevTools: throttle to "Slow 3G"
   - Send message
   - Verify streaming increments (not frozen)

### Monitoring

Watch these metrics for 30 minutes:

- **EB Health**: Must stay Green
- **CPU**: Should be <70% average
- **Memory**: Should be <80% average
- **Error Rate**: Should be 0% or <0.1%
- **Response Latency**: Should be <500ms p50, <2s p99

---

## Step 5: ROLLBACK (if needed)

### Automatic Rollback

If deployment fails at any stage, GitHub Actions automatically:

```bash
git revert <atomic-switch-commit>
git push origin main
```

EB will detect the revert and redeploy old version within 1-2 minutes.

### Manual Rollback

If something goes wrong after deployment:

```bash
# 1. Find the atomic switch commit
git log --oneline | grep "atomic: switch"

# 2. Revert it
git revert <commit-hash>

# 3. Push to main (triggers EB deployment)
git push origin main

# 4. Monitor EB health to confirm old UI is back
```

**Result**: 
- Downtime: < 1 minute (just the redeployment time)
- Users see old UI after page refresh

---

## Step 6: Cleanup (After 24-48h Stability)

Once AION v1 has been running stable for 24-48 hours:

```bash
# 1. Remove old Node chat routes/logic from backend
rm -rf backend/routes/old-chat-routes.js
rm -rf backend/controllers/old-chat-controller.js

# 2. Remove shadow UI/API endpoints
# (delete all /__aion_shadow/* routes from server.js)

# 3. Simplify server.js (remove old UI static serving)

# 4. Clean up old UI build artifacts
rm -rf old-ui/

# 5. Commit cleanup
git add .
git commit -m "cleanup: remove old AION v0 code and shadow deployment UI"
git push origin main

# 6. Create release tag
git tag -a v1.0.0-live -m "AION v1 production live"
git push origin v1.0.0-live
```

---

## Troubleshooting

### Pre-Flight Checks Fail

**Symptom**: `/health` endpoint returns 5xx or timeout

**Solution**:
1. SSH into EB EC2 instance
2. Check Node.js process: `pm2 list` or `ps aux | grep node`
3. Check logs: `tail -f /var/log/eb-activity.log`
4. Restart if needed: `pm2 restart all`
5. Re-run pre-flight checks

### Streaming Returns Buffered Response

**Symptom**: `/api/chat` returns entire response at once (not streaming)

**Solution**:
1. Check Python backend is streaming correctly: `curl -N http://localhost:8000/api/v1/chat`
2. Check Node proxy middleware config in `backend/server.js`
3. Check NGINX settings (if reverse proxy)
4. Ensure no gzip compression buffering: `Content-Encoding: identity`

### EB Deployment Stuck at Yellow

**Symptom**: Health remains Yellow > 5 minutes

**Solution**:
1. Check EB Events for errors
2. SSH into instance, check logs: `/var/log/eb-engine.log`
3. If CloudFormation errors: Check IAM permissions
4. If app errors: Check application logs
5. Manual restart: `sudo systemctl restart elasticbeanstalk`

### Production UI Shows Old UI

**Symptom**: After deployment, old UI still visible

**Solution**:
1. Check EB is actually running new version: `eb status`
2. Hard refresh browser: `Ctrl+Shift+R` (Chrome) or `Cmd+Shift+R` (Mac)
3. Clear browser cache
4. Check `frontend/dist/` is built and included in deployment artifact
5. Verify EB is serving from correct path in `server.js`

---

## Success Criteria

✅ Deployment considered **successful** when:

1. Pre-flight checks all pass (Green)
2. Atomic switch commits + pushes without error
3. EB deployment completes (Green health)
4. Production UI loads (new AION UI visible)
5. Streaming API works (chunks received)
6. Real user simulation passes
7. 30-minute observation window has no errors
8. No rollback triggered

✅ You are now **LIVE** 🚀

---

## Contacts & Escalation

- **EB Issues**: Check AWS Console → Support Center
- **GitHub Actions Failures**: Check workflow logs + re-run
- **Application Issues**: SSH to EB instance and check logs
- **Rollback**: Anytime - execute manual rollback steps above

---

**Last Updated**: January 12, 2026
**AION v1 Status**: Pre-Deployment (Awaiting IAM Fix)
