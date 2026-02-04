# AION v1 - Production Operations Runbook

## 🚨 Emergency Contacts

**On-Call Engineer**: Rajeev Rajora
**Escalation Path**: CTO → Infrastructure Team
**Incident Channel**: #aion-incidents

---

## 🛠️ System Architecture

### Components
- **Frontend**: React (Vercel)
- **Backend API**: Node.js + Express (AWS Elastic Beanstalk)
- **AI Backend**: Python FastAPI (AWS Elastic Beanstalk, port 8000)
- **Database**: MongoDB Atlas
- **AI Provider**: OpenAI API

### Ports
- Node.js Backend: 5000
- Python Backend: 8000
- MongoDB: 27017

---

## 🔥 Incident Response

### Service Down

**Symptoms**: Health check failing, 503 errors

```bash
# 1. Check service status
aws elasticbeanstalk describe-environment-health \
  --environment-name aion-v1-prod \
  --attribute-names All

# 2. Check logs
eb logs -z

# 3. Restart application
eb restart

# 4. If persistent, rollback
eb deploy --version <previous-version>
```

### High Error Rate

**Symptoms**: Error rate >1%

```bash
# 1. Check CloudWatch logs
aws logs tail /aws/elasticbeanstalk/aion-v1-prod/var/log/nodejs/nodejs.log --follow

# 2. Check MongoDB connection
mongosh "$MONGODB_URI" --eval "db.serverStatus()"

# 3. Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# 4. Verify environment variables
eb printenv
```

### High Latency

**Symptoms**: P95 >500ms

```bash
# 1. Check CPU/Memory
eb health --refresh

# 2. Scale up instances
eb scale 3

# 3. Check database performance
# MongoDB Atlas → Metrics → Slow Queries

# 4. Enable connection pooling
# Verify MONGODB_URI has maxPoolSize parameter
```

### Database Connection Issues

```bash
# 1. Test connection
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# 2. Check IP whitelist (MongoDB Atlas)
# Network Access → IP Access List → Add current IP

# 3. Verify credentials
echo $MONGODB_URI | sed 's/:.*@/:***@/'

# 4. Check connection limits
# MongoDB Atlas → Metrics → Connections
```

---

## 📊 Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Alert Level |
|--------|-----------|-------------|
| Error Rate | >0.1% | Warning |
| Error Rate | >1% | Critical |
| P95 Latency | >500ms | Warning |
| P95 Latency | >1s | Critical |
| CPU Usage | >70% | Warning |
| CPU Usage | >90% | Critical |
| Memory Usage | >80% | Warning |
| Memory Usage | >95% | Critical |
| MongoDB Connections | >80% of max | Warning |

### CloudWatch Dashboards

```bash
# View real-time metrics
aws cloudwatch get-dashboard --dashboard-name AION-Production

# Create custom alarm
aws cloudwatch put-metric-alarm \
  --alarm-name aion-high-error-rate \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name Errors \
  --namespace AWS/ElasticBeanstalk \
  --period 300 \
  --statistic Sum \
  --threshold 10
```

---

## 🔄 Deployment Procedures

### Standard Deployment

```bash
# 1. Run tests locally
cd backend
npm test
cd python_backend
pytest

# 2. Commit and push
git add .
git commit -m "feat: description"
git push origin main

# 3. Monitor deployment
# GitHub Actions → Deploy Production → Watch logs

# 4. Verify deployment
curl https://api.rajora.co.in/health
curl https://api.rajora.co.in/__aion_shadow/api/health

# 5. Run smoke tests
npm run test:smoke
```

### Rollback Procedure

```bash
# Option 1: Via AWS Console
# Elastic Beanstalk → Environments → aion-v1-prod → 
# Actions → Deploy a different version → Select previous

# Option 2: Via EB CLI
eb use aion-v1-prod
eb deploy --version app-v1.2.3-stable

# Option 3: Git Revert
git revert HEAD
git push origin main
# Wait for automatic deployment

# Expected rollback time: 2-5 minutes
```

### Blue-Green Deployment

```bash
# 1. Deploy to shadow path (already configured)
# Frontend calls: /__aion_shadow/api

# 2. Test shadow backend
curl https://api.rajora.co.in/__aion_shadow/api/health

# 3. Swap environment URLs (zero downtime)
aws elasticbeanstalk swap-environment-cnames \
  --source-environment aion-v1-blue \
  --destination-environment aion-v1-green

# 4. Monitor for 15 minutes

# 5. If issues, swap back
aws elasticbeanstalk swap-environment-cnames \
  --source-environment aion-v1-green \
  --destination-environment aion-v1-blue
```

---

## 🔐 Security Procedures

### Rotate API Keys

```bash
# 1. Generate new OpenAI key
# https://platform.openai.com/api-keys → Create new key

# 2. Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id aion-openai-key \
  --secret-string "new-key-here"

# 3. Update Elastic Beanstalk environment
eb setenv OPENAI_API_KEY=new-key-here

# 4. Test
curl -X POST https://api.rajora.co.in/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# 5. Revoke old key from OpenAI dashboard
```

### Rotate MongoDB Credentials

```bash
# 1. MongoDB Atlas → Database Access → Edit User
# Update password

# 2. Update connection string
MONGODB_URI="mongodb+srv://user:NEW_PASSWORD@cluster.mongodb.net/aion"

# 3. Update in EB
eb setenv MONGODB_URI="$MONGODB_URI"

# 4. Restart application
eb restart
```

---

## 🧰 Maintenance Tasks

### Weekly
- [ ] Review CloudWatch logs for errors
- [ ] Check MongoDB slow queries
- [ ] Review API usage and costs
- [ ] Verify backup completion

### Monthly
- [ ] Run security audit: `npm audit` + `safety check`
- [ ] Update dependencies
- [ ] Review and optimize database indexes
- [ ] Load testing: `npm run load-test`
- [ ] Disaster recovery drill

### Quarterly
- [ ] Review and update runbook
- [ ] Conduct security review
- [ ] Capacity planning review
- [ ] Cost optimization audit

---

## 📝 Useful Commands

```bash
# Tail logs in real-time
eb logs --stream

# SSH into instance
eb ssh

# Check environment variables
eb printenv

# Set environment variable
eb setenv KEY=value

# Scale instances
eb scale 3

# Check health
eb health --refresh

# Database backup
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)

# Database restore
mongorestore --uri="$MONGODB_URI" backup-20260204/
```

---

## ☎️ Support Escalation

1. **Level 1**: Check this runbook
2. **Level 2**: Check CloudWatch logs and metrics
3. **Level 3**: Rollback to last known good version
4. **Level 4**: Contact AWS Support (if infrastructure issue)
5. **Level 5**: Contact OpenAI Support (if API issue)

---

**Last Updated**: February 4, 2026
**Owner**: DevOps Team
**Review Cadence**: Monthly
