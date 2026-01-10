# ⚠️ ACTION REQUIRED: Complete Backend Deployment

## 🚨 CURRENT STATUS

### ✅ What's Been Completed

1. **AWS Elastic Beanstalk Infrastructure** - READY ✅
   - Application: `aion-backend`
   - Environment: `Aion-backend-env` (ID: e-6hmizsturs)
   - Platform: Node.js 24 on Amazon Linux 2023/6.7.1
   - **Backend URL**: `http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com`
   - Status: ✅ **Successfully launched and running**

2. **IAM Roles** - READY ✅
   - Service Role: `aws-elasticbeanstalk-service-role`
   - EC2 Instance Profile: `aws-elasticbeanstalk-ec2-role`

3. **GitHub Actions Workflow** - CREATED ✅
   - File: `.github/workflows/deploy-backend-eb.yml`
   - Configured to deploy backend to Elastic Beanstalk
   - Triggers on backend code changes or manual dispatch

### ❌ What's Blocking Deployment

**ISSUE**: GitHub Actions deployment failing with:
```
Error: Status: 403. Code: InvalidClientTokenId
Message: The security token included in the request is invalid
```

**ROOT CAUSE**: AWS credentials in GitHub Secrets are invalid/expired.

---

## 🔧 WHAT YOU NEED TO DO NOW

### Step 1: Create Fresh AWS Access Keys (5 minutes)

1. **Go to AWS IAM Console**:
   ```
   https://us-east-1.console.aws.amazon.com/iam/home#/users/details/aion-deployer?section=security_credentials
   ```

2. **Delete Old Access Keys**:
   - Click "Actions" dropdown for **AKIAGO2ISXTTGWUKFFHZ**
   - Click "Deactivate" → then "Delete"
   - Confirm deletion by entering the access key ID
   - Repeat for **AKIA6O2ISXTT1MDXMG5F**

3. **Create New Access Key**:
   - Click **"Create access key"** button
   - Select use case: **"Third-party service"**
   - Description: `GitHub Actions - AION Backend Deployment`
   - Click **"Create access key"**

4. **CRITICAL - Save Credentials Immediately**:
   - ⚠️ **Access key ID**: Copy and save (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - ⚠️ **Secret access key**: Copy and save (shown ONLY ONCE!)
   - Click **"Download .csv file"** as backup
   - Store securely - you'll need these in Step 2

---

### Step 2: Update GitHub Secrets (2 minutes)

1. **Go to GitHub Secrets**:
   ```
   https://github.com/rajeevrajora77-lab/AION-v1/settings/secrets/actions
   ```

2. **Update AWS_ACCESS_KEY_ID**:
   - Find `AWS_ACCESS_KEY_ID` secret
   - Click **"Update"**
   - Paste the NEW Access Key ID from Step 1
   - Click **"Update secret"**

3. **Update AWS_SECRET_ACCESS_KEY**:
   - Find `AWS_SECRET_ACCESS_KEY` secret
   - Click **"Update"**
   - Paste the NEW Secret Access Key from Step 1
   - Click **"Update secret"**

---

### Step 3: Manually Trigger Backend Deployment (1 minute)

1. **Go to GitHub Actions**:
   ```
   https://github.com/rajeevrajora77-lab/AION-v1/actions
   ```

2. **Select the Workflow**:
   - Click on **"Deploy Backend to Elastic Beanstalk"** in the left sidebar

3. **Run Workflow**:
   - Click **"Run workflow"** dropdown (top right)
   - Branch: `main`
   - Click green **"Run workflow"** button

4. **Monitor Progress**:
   - Wait 2-3 minutes for deployment to complete
   - Workflow steps:
     - ✅ Checkout code
     - ✅ Setup Node.js
     - ✅ Create deployment package
     - ✅ Deploy to Elastic Beanstalk
     - ✅ Deployment complete

---

### Step 4: Update Frontend API URL (5 minutes)

1. **Update Environment Variable**:
   - Go to `frontend/.env.production`
   - Change:
     ```env
     VITE_API_URL=http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com
     ```

2. **Commit and Push**:
   ```bash
   git add frontend/.env.production
   git commit -m "fix: Update frontend API URL to Elastic Beanstalk backend"
   git push origin main
   ```

3. **Frontend Will Auto-Deploy**:
   - GitHub Actions will automatically rebuild and redeploy frontend to S3
   - Wait ~2 minutes for deployment

---

### Step 5: Configure Environment Variables in AWS (3 minutes)

1. **Go to Elastic Beanstalk Console**:
   ```
   https://us-east-1.console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/environment/dashboard?environmentId=e-6hmizsturs
   ```

2. **Navigate to Configuration**:
   - Click **"Configuration"** in left sidebar
   - Under "Software", click **"Edit"**

3. **Add Environment Properties**:
   Scroll to "Environment properties" section and add:
   ```
   MONGODB_URI = your_mongodb_connection_string
   JWT_SECRET = your_jwt_secret_key
   NODE_ENV = production
   PORT = 8080
   ```

4. **Apply Changes**:
   - Click **"Apply"** at bottom
   - Wait 1-2 minutes for environment to update

---

### Step 6: Test Your Application (2 minutes)

1. **Test Backend Directly**:
   ```bash
   curl http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com/health
   ```
   Expected: `{"status":"ok"}` or similar

2. **Test Frontend**:
   - Open: https://rajora.co.in
   - Try chat feature
   - Try search feature
   - Check browser console for errors

3. **Verify API Connectivity**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try using the app
   - Confirm API calls go to `Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com`

---

## 📦 Quick Reference

### Important URLs

| Resource | URL |
|----------|-----|
| **Frontend (Live)** | https://rajora.co.in |
| **Backend (EB)** | http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com |
| **EB Console** | https://us-east-1.console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/environment/dashboard?environmentId=e-6hmizsturs |
| **IAM Console** | https://us-east-1.console.aws.amazon.com/iam/home#/users/details/aion-deployer |
| **GitHub Actions** | https://github.com/rajeevrajora77-lab/AION-v1/actions |
| **GitHub Secrets** | https://github.com/rajeevrajora77-lab/AION-v1/settings/secrets/actions |

### IAM User Details

- **User**: aion-deployer
- **Permissions**: AdministratorAccess
- **Current Access Keys**: 2 (both currently inactive/invalid)
- **Action Needed**: Delete old keys, create new key

### Backend Details

- **Application**: aion-backend
- **Environment**: Aion-backend-env
- **Environment ID**: e-6hmizsturs
- **Platform**: Node.js 24 on 64bit Amazon Linux 2023/6.7.1
- **Instance Type**: t2.micro (free tier eligible)
- **Region**: us-east-1 (N. Virginia)

---

## 📝 Verification Checklist

Before considering deployment complete, verify:

- [ ] Old AWS access keys deleted
- [ ] New AWS access key created and saved
- [ ] GitHub Secrets updated (AWS_ACCESS_KEY_ID)
- [ ] GitHub Secrets updated (AWS_SECRET_ACCESS_KEY)
- [ ] Backend deployment workflow manually triggered
- [ ] Backend deployment successful (check GitHub Actions)
- [ ] Frontend .env.production updated with EB URL
- [ ] Frontend redeployed automatically
- [ ] Environment variables configured in EB
- [ ] Backend health check responds correctly
- [ ] rajora.co.in loads successfully
- [ ] Frontend can communicate with backend
- [ ] Chat feature works end-to-end
- [ ] Search feature works end-to-end

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ GitHub Actions shows green checkmark for "Deploy Backend to Elastic Beanstalk"
2. ✅ Backend URL responds: `http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com`
3. ✅ Frontend loads: `https://rajora.co.in`
4. ✅ Browser console shows API calls to EB backend
5. ✅ Chat and search features work without errors

---

## 🐛 Troubleshooting

### If Backend Deployment Fails

1. **Check GitHub Actions logs**:
   - Go to failed workflow run
   - Click on failed step
   - Read error message

2. **Common Issues**:
   - **403 Forbidden**: AWS credentials still invalid → Verify secrets updated
   - **Deployment timeout**: EB environment unhealthy → Check EB logs
   - **ZIP creation failed**: Missing backend files → Check backend/ directory

### If Frontend Can't Reach Backend

1. **Check .env.production**:
   - Verify URL is exactly: `http://Aion-backend-env.eba-4uswimrs.us-east-1.elasticbeanstalk.com`
   - No trailing slash
   - Include `http://` protocol

2. **Check CORS Configuration**:
   - Backend must allow `https://rajora.co.in`
   - Check `backend/config/cors.js` or equivalent

3. **Check Browser Console**:
   - F12 → Console tab
   - Look for CORS errors or network errors
   - Check Network tab for failed requests

### If EB Environment is Degraded

1. **Check EB Logs**:
   - EB Console → Logs → Request Logs → Last 100 Lines

2. **Common Issues**:
   - Port mismatch: App must listen on port 8080
   - Missing dependencies: Check package.json
   - Environment variables: Verify MONGODB_URI set

---

## 📊 Estimated Time

| Task | Time |
|------|------|
| Create AWS access keys | 5 min |
| Update GitHub secrets | 2 min |
| Trigger deployment | 1 min |
| Wait for deployment | 3 min |
| Update frontend .env | 5 min |
| Configure EB env vars | 3 min |
| Test application | 2 min |
| **TOTAL** | **~20 minutes** |

---

## 🚀 After Deployment

Once everything is working:

1. **Monitor Health**:
   - EB Console → Monitoring tab
   - Check CPU, Memory, Network metrics

2. **Set Up Alerts** (Optional):
   - CloudWatch Alarms for high CPU/Memory
   - SNS notifications for environment health

3. **Plan Scaling** (If Needed):
   - Currently single instance (free tier)
   - Can upgrade to load-balanced for production

---

**Last Updated**: January 11, 2026  
**Status**: ⚠️ **AWAITING USER ACTION**  
**Next Step**: Create new AWS access keys (Step 1 above)
