# 🔒 AION v1 - Security Setup Guide

## ⚠️ CRITICAL: Environment Variables Security

### What Changed?

We've removed all `.env` files from the repository for security reasons. These files previously contained configuration that should only exist in production environments or local development.

### Files Removed:
- `backend/.env` ❌ (removed from Git)
- `frontend/.env` ❌ (removed from Git)

### Files Added:
- `frontend/.env.production` ✅ (safe to commit - no secrets)

---

## 🛠️ Local Development Setup

### Backend Environment Variables

Create `backend/.env` file locally (this file is gitignored):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/aion
# OR use MongoDB Atlas for production-like testing:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aion

# JWT Authentication (CRITICAL)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
# Generate secure secret:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Application Settings
LOG_LEVEL=debug
```

### Frontend Environment Variables

Create `frontend/.env` file locally (this file is gitignored):

```bash
# Local Development API URL
VITE_API_URL=http://localhost:5000
VITE_MODE_ENV=development
```

**Note:** For production, use `frontend/.env.production` (already in repo)

---

## ☁️ Production Environment Variables

### AWS Elastic Beanstalk Configuration

1. **Go to Elastic Beanstalk Console:**
   ```
   https://us-east-1.console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/environment/dashboard?environmentId=e-6hmizsturs
   ```

2. **Navigate to:** Configuration → Software → Edit

3. **Add these environment properties:**

```bash
# CRITICAL - Required for authentication
JWT_SECRET=<paste-your-production-jwt-secret-here>

# OpenAI API Key
OPENAI_API_KEY=<paste-your-openai-key-here>
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# MongoDB Atlas (Production Database)
MONGODB_URI=<paste-your-mongodb-atlas-connection-string>

# Server Configuration
PORT=8080
NODE_ENV=production
FRONTEND_URL=https://rajora.co.in

# Application Settings
LOG_LEVEL=info

# Rate Limiting (Optional - defaults in code)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Click "Apply"** and wait 1-2 minutes for environment update

---

## 🔑 How to Generate Secure Secrets

### JWT Secret (REQUIRED)

```bash
# Generate 64-byte random hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Copy the output and use it as your `JWT_SECRET`**

### Example Output:
```
a1b2c3d4e5f6....(128 characters)....xyz789
```

---

## 🚨 Security Best Practices

### ✅ DO:
- Keep `.env` files only in your local development environment
- Use AWS Elastic Beanstalk environment variables for production secrets
- Rotate secrets regularly (every 90 days)
- Use strong, randomly generated secrets (min 32 characters)
- Use different secrets for development and production
- Store backup of production secrets in secure password manager

### ❌ DON'T:
- Never commit `.env` files to Git (they're gitignored now)
- Never share secrets in Slack, email, or chat
- Never use simple/predictable secrets ("password123", "secret", etc.)
- Never reuse secrets across different environments
- Never hardcode secrets in source code
- Never expose secrets in error messages or logs

---

## 📋 Verification Checklist

### Local Development:
- [ ] Created `backend/.env` with all required variables
- [ ] Created `frontend/.env` with local API URL
- [ ] Backend starts without errors (`cd backend && npm start`)
- [ ] Frontend connects to local backend
- [ ] JWT authentication works
- [ ] MongoDB connection successful

### Production Deployment:
- [ ] All environment variables configured in AWS EB
- [ ] `JWT_SECRET` is strong and unique
- [ ] `MONGODB_URI` points to production MongoDB Atlas
- [ ] `OPENAI_API_KEY` is valid and has sufficient credits
- [ ] Backend health check passes: `/health`
- [ ] Frontend loads from S3/CloudFront
- [ ] Frontend connects to EB backend successfully
- [ ] CORS allows `https://rajora.co.in`

---

## 🔄 Secret Rotation Procedure

### When to Rotate:
- Every 90 days (recommended)
- Immediately if secrets are exposed/compromised
- When team member with access leaves
- After security incidents

### How to Rotate:

#### 1. JWT Secret Rotation
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update in AWS EB environment variables
# Redeploy or restart environment
# All users will need to re-authenticate
```

#### 2. OpenAI API Key Rotation
```bash
# Go to OpenAI Dashboard → API Keys
# Create new key
# Update AWS EB environment variable
# Delete old key from OpenAI dashboard
```

#### 3. MongoDB Credentials Rotation
```bash
# Go to MongoDB Atlas → Database Access
# Create new user with same permissions
# Update connection string in AWS EB
# Test connection
# Delete old user
```

---

## 🆘 Emergency: If Secrets Are Exposed

### Immediate Actions (within 1 hour):

1. **Rotate ALL secrets immediately**
2. **Review Git history** - check if secrets were committed
3. **Revoke exposed API keys** (OpenAI, MongoDB, AWS)
4. **Check application logs** for unauthorized access
5. **Monitor AWS billing** for unusual activity
6. **Update GitHub secrets** if AWS credentials were exposed
7. **Notify team** about the incident

### Git History Cleanup (if needed):
```bash
# ⚠️ CAUTION: This rewrites Git history
# Use BFG Repo-Cleaner to remove secrets from history

# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy
git clone --mirror https://github.com/rajeevrajora77-lab/AION-v1.git

# Remove .env files from history
bfg --delete-files .env AION-v1.git

# Clean up
cd AION-v1.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ Team coordination required)
git push --force
```

---

## 📞 Support

If you have questions about security setup:

1. Check this guide first
2. Review `backend/.env.example` for reference
3. Check AWS Elastic Beanstalk logs for errors
4. Contact team lead for production credentials access

---

**Last Updated:** February 17, 2026  
**Security Level:** 🔒 Production-Grade  
**Compliance:** ✅ Best Practices Implemented
