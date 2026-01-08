# AION v1 — AWS Deployment Guide

**Status**: Production Ready (Beta-Launch)
**Domain**: rajora.co.in
**Environment**: AWS (ap-south-1 + us-east-1)
**Date**: January 8, 2026

---

## 📋 Prerequisites

Before starting, ensure you have:
- AWS Account with billing setup
- Domain `rajora.co.in` pointed to Route 53
- MongoDB Atlas cluster (external)
- OpenAI API key
- Git and Node.js 18+ on local machine
- AWS CLI configured locally

---

## 🏗️ AWS Architecture

```
User Browser (rajora.co.in)
           |
           v
   CloudFront (HTTPS, CDN)
       |         |
       |         |
    [/]      [/api/*]
       |         |
       v         v
   S3 Bucket    ALB
   (Static)      |
               EC2:5000
                 |
                 v
            Node.js (Express)
                 |
                 v
           MongoDB Atlas
```

**Why This Architecture?**
- ✅ Cost-effective (S3 + CloudFront is cheap)
- ✅ Scales cleanly (ALB auto-scaling ready)
- ✅ Production-grade security (HTTPS everywhere)
- ✅ AWS best practices
- ✅ No vendor lock-in

---

## 🚀 STEP 1 — Prepare Frontend Build

### 1.1 Set Production API URL

Create `frontend/.env.production`:

```env
VITE_API_URL=https://api.rajora.co.in/api
```

### 1.2 Build Frontend

```bash
cd frontend
npm install
npm run build
```

**Output**: `frontend/dist/` (ready for S3)

**Verify build contains**:
- index.html
- assets/ folder
- No hardcoded localhost URLs

---

## 🪣 STEP 2 — Deploy Frontend to S3 + CloudFront

### 2.1 Create S3 Bucket

**AWS Console → S3 → Create bucket**

| Setting | Value |
|---------|-------|
| Bucket Name | `rajora.co.in` |
| Region | `ap-south-1` (Mumbai) |
| ACL | Private |
| Block Public Access | **Uncheck** "Block all" |

### 2.2 Enable Static Website Hosting

**S3 → Bucket → Properties → Static website hosting**

```
Enable: ON
Index: index.html
Error: index.html (CRITICAL for SPA routing)
```

### 2.3 Upload Frontend Build

```bash
cd frontend/dist
aws s3 sync . s3://rajora.co.in --delete
```

**Important**: Upload *contents* of `dist/`, NOT the folder itself.

### 2.4 Create CloudFront Distribution

**AWS Console → CloudFront → Create distribution**

| Setting | Value |
|---------|-------|
| Origin Domain | `rajora.co.in.s3.amazonaws.com` |
| Origin Path | (empty) |
| Viewer Protocol | Redirect HTTP → HTTPS |
| Allowed HTTP Methods | GET, HEAD, OPTIONS |
| Cache Policy | CachingOptimized |
| Default Root Object | `index.html` |
| Custom Error Responses | 404 → /index.html (SPA) |

**Copy CloudFront domain**: `d123.cloudfront.net` (we'll use this in Route 53)

---

## 🔐 STEP 3 — SSL Certificate (ACM)

### 3.1 Request Certificate

**AWS Console → Certificate Manager (us-east-1) → Request**

```
Domain: rajora.co.in
Alternative: *.rajora.co.in (wildcard for subdomains)
Validation: DNS
```

### 3.2 Validate Certificate

**Route 53 → Create CNAME record** (AWS auto-generates this)

**Wait for Issued status** (~5 minutes)

### 3.3 Attach to CloudFront

**CloudFront Distribution → Edit → SSL Certificate → Select ACM cert**

---

## 🌍 STEP 4 — Route 53 DNS Setup

### 4.1 Create Hosted Zone (if not exists)

**Route 53 → Hosted zones → Create zone → rajora.co.in**

### 4.2 Add A Record for Frontend

| Type | Name | Target | Comment |
|------|------|--------|----------|
| A | `rajora.co.in` | CloudFront dist `d123...` | Frontend |

### 4.3 Add CNAME for API (placeholder)

| Type | Name | Target | Comment |
|------|------|--------|----------|
| CNAME | `api.rajora.co.in` | ALB DNS (later) | Backend API |

**Note**: You'll update the ALB target after creating it.

---

## 🖥️ STEP 5 — Backend Deployment (EC2)

### 5.1 Launch EC2 Instance

**EC2 → Instances → Launch Instance**

| Setting | Value |
|---------|-------|
| AMI | Amazon Linux 2023 |
| Instance Type | `t3.micro` |
| VPC | Default |
| Subnet | Default (public) |
| Auto-assign IP | Yes |
| Security Group | Create: `aion-backend-sg` |

**Security Group Inbound Rules**:

```
HTTP (80)   | From ALB Security Group
SSH (22)    | From Your IP Only
```

### 5.2 Install Node.js

**SSH into EC2**:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

**Install Node.js 18**:

```bash
sudo yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git
node -v  # Verify: v18.x.x
```

### 5.3 Clone and Deploy Backend

```bash
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd AION-v1/backend
npm install
```

### 5.4 Environment Variables (CRITICAL)

**Create** `/home/ec2-user/AION-v1/backend/.env`:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/aion

# AI
OPENAI_API_KEY=sk-your-real-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000

# Search
SERPAPI_KEY=your-serpapi-key
# OR
BING_API_KEY=your-bing-key

# CORS
FRONTEND_URL=https://rajora.co.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5.5 Start Backend with PM2

```bash
sudo npm install -g pm2
cd /home/ec2-user/AION-v1/backend
pm2 start server.js --name aion-backend
pm2 save
pm2 startup
```

**Verify**:

```bash
pm2 list
# Should show: aion-backend (online)

curl http://localhost:5000/health
# Should return: {"status": "OK", ...}
```

---

## ⚖️ STEP 6 — Application Load Balancer (ALB)

### 6.1 Create Target Group

**EC2 → Target Groups → Create**

| Setting | Value |
|---------|-------|
| Name | `aion-backend-tg` |
| Protocol | HTTP |
| Port | `5000` |
| VPC | Default |
| Health Check Path | `/health` |
| Healthy Threshold | `2` |
| Unhealthy Threshold | `2` |
| Timeout | `5` seconds |
| Interval | `30` seconds |

### 6.2 Register EC2 Instance

**Target Group → Targets → Register**
- Select your EC2 instance
- Port: `5000`
- Click Register

### 6.3 Create Application Load Balancer

**EC2 → Load Balancers → Create ALB**

| Setting | Value |
|---------|-------|
| Name | `aion-alb` |
| Scheme | Internet-facing |
| VPC | Default |
| Subnets | Select 2 (multi-AZ) |
| Security Group | Create: `aion-alb-sg` |

**Security Group**:

```
HTTP (80)   | From 0.0.0.0/0
HTTPS (443) | From 0.0.0.0/0
```

### 6.4 Add Listeners

**Listener 1: HTTP → HTTPS Redirect**

```
Protocol: HTTP
Port: 80
Action: Redirect to HTTPS (301)
```

**Listener 2: HTTPS → Target Group**

```
Protocol: HTTPS
Port: 443
SSL Certificate: Select ACM cert (rajora.co.in)
Target Group: aion-backend-tg
```

### 6.5 Get ALB DNS

**ALB Details → DNS name**: `aion-alb-123.ap-south-1.elb.amazonaws.com`

---

## 🔗 STEP 7 — Update Route 53

**Route 53 → Hosted Zone → api.rajora.co.in**

| Type | Name | Target | Comment |
|------|------|--------|----------|
| CNAME | `api.rajora.co.in` | `aion-alb-123.ap-south-1.elb.amazonaws.com` | ALB DNS |

**Wait**: DNS propagation (~5 minutes)

---

## ✅ STEP 8 — Final Verification

### 8.1 Frontend

```bash
# Should load AION app
https://rajora.co.in

# Certificate should be valid
# No mixed content warnings
```

### 8.2 Backend Health

```bash
curl https://api.rajora.co.in/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2026-01-08T...",
  "uptime": 3600.5,
  "environment": "production"
}
```

### 8.3 API Endpoints

**Chat**:
```bash
curl -X POST https://api.rajora.co.in/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test"}'
```

**Search**:
```bash
curl -X POST https://api.rajora.co.in/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI"}'
```

**Voice**:
```bash
curl -X POST https://api.rajora.co.in/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Hello world", "sessionId": "test"}'
```

### 8.4 Frontend App Test

- ✅ Chat page loads
- ✅ Can send messages
- ✅ Can search
- ✅ Can use voice (Chrome)
- ✅ No console errors

---

## 🛡️ Post-Launch (Optional)

### Monitoring
```bash
# CloudWatch alarms
- EC2 CPU > 80%
- ALB Unhealthy Hosts > 0
- Error 4xx/5xx counts
```

### Security
```bash
# AWS WAF (basic rules)
# Daily MongoDB Atlas backups
# OpenAI monthly budget alerts
```

### Scaling (v2)
```bash
# Auto-scaling group for EC2
# RDS for database migration
# CloudFront cache optimization
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check EC2 health, ALB targets |
| CORS errors | Verify FRONTEND_URL in .env |
| 404 on refresh | Confirm S3 error page set to index.html |
| Slow performance | Check CloudFront cache settings |
| High costs | Use t3.micro, consolidate NAT gateways |

---

## 📞 Support

**Deployment Issues**:
- Check ALB health checks: `https://api.rajora.co.in/health`
- View EC2 logs: `pm2 logs aion-backend`
- Check CloudWatch in AWS Console

---

**Status**: ✅ READY FOR PRODUCTION LAUNCH

**Domain**: https://rajora.co.in
**API**: https://api.rajora.co.in
