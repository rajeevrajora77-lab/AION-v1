# 🚀 AION v1 - AWS EB Deployment Recovery Guide

**Issue**: "Incorrect application version found on all instances"
**Root Cause**: Stale EC2 instances not receiving latest code from GitHub
**Solution**: Terminate old instances, force Auto Scaling Group to launch fresh ones

---

## ⚡ QUICK FIX (5 minutes)

### Option 1: Automated Script (Recommended)

```bash
# 1. Clone repo locally
git clone https://github.com/rajeevrajora77-lab/AION-v1.git
cd AION-v1

# 2. Install AWS CLI (if not already installed)
pip install awscli

# 3. Configure AWS credentials
aws configure
# Enter your AWS Access Key ID and Secret Access Key

# 4. Edit script with your configuration
sed -i 's/aion-backend-env/YOUR_EB_ENV_NAME/g' AWS_EB_DEPLOYMENT_FIX.sh
sed -i 's/us-east-1/YOUR_AWS_REGION/g' AWS_EB_DEPLOYMENT_FIX.sh

# 5. Run the fix script
bash AWS_EB_DEPLOYMENT_FIX.sh

# Wait 5-10 minutes for instances to launch and become healthy
```

### Option 2: Manual AWS Console

1. Go to AWS Console > EC2 > Instances
2. Find instances in your EB environment
3. Select all instances
4. Right-click > Instance State > Terminate
5. Go to ElasticBeanstalk > Environments > Your Environment
6. Click "Update environment" to redeploy
7. Wait for green status

### Option 3: AWS CLI Commands (Copy-paste)

```bash
# Get your environment name first
EB_ENV="aion-backend-env"
AWS_REGION="us-east-1"

# Find Auto Scaling Group
ASG=$(aws elasticbeanstalk describe-environment-resources \\
  --environment-name $EB_ENV \\
  --region $AWS_REGION \\
  --query 'EnvironmentResources.AutoScalingGroups[0].Name' \\
  --output text)

echo "Found ASG: $ASG"

# Get instances
INSTANCES=$(aws autoscaling describe-auto-scaling-groups \\
  --auto-scaling-group-names $ASG \\
  --region $AWS_REGION \\
  --query 'AutoScalingGroups[0].Instances[*].InstanceId' \\
  --output text)

echo "Found instances: $INSTANCES"

# Terminate them
for INSTANCE in $INSTANCES; do
  echo "Terminating: $INSTANCE"
  aws ec2 terminate-instances --instance-ids $INSTANCE --region $AWS_REGION
done

echo "Instances terminated. ASG will launch new ones within 2 minutes"
echo "GitHub Actions will deploy latest code automatically"
```

---

## ✅ VERIFY THE FIX

### Step 1: Check EB Health Status

1. Go to AWS Console > Elastic Beanstalk > Environments > "aion-backend-env"
2. Watch "Health" column - should go from Red → Yellow → Green
3. "Status" should show "Ready"
4. Takes ~5-10 minutes

### Step 2: Test Endpoints

```bash
# Get your EB environment URL
EB_URL=$(aws elasticbeanstalk describe-environments \\
  --environment-name aion-backend-env \\
  --region us-east-1 \\
  --query 'Environments[0].CNAME' \\
  --output text)

echo "Environment URL: $EB_URL"

# Test old endpoint (should work)
curl https://$EB_URL/health

# Test shadow paths (new system)
curl https://$EB_URL/__aion_shadow/api/health
curl https://$EB_URL/__aion_shadow/ui
```

### Step 3: Check GitHub Actions

1. Go to GitHub > Actions tab
2. Should see "Deploy Backend to Elastic Beanstalk" running/completed
3. Should say ✅ "success" or 🟡 "in progress"

### Step 4: Monitor CloudWatch

1. Go to AWS > CloudWatch > Logs
2. Look for "/aws/elasticbeanstalk/aion-backend-env/var/log/eb-activity.log"
3. Should see "latest code deployed successfully"

---

## 🔄 WHAT HAPPENS AFTER YOU RUN THE FIX

### Timeline

**T+0 (Now)**: Run the fix script or terminate instances manually
- Old EC2 instances are terminated
- Auto Scaling Group detects missing instances

**T+2 minutes**: New EC2 instances launch
- AWS launches replacement instances
- Instances boot up and get security updates

**T+3-4 minutes**: GitHub Actions deploys
- Elastic Beanstalk triggers automatic deployment
- Latest code from main branch is cloned
- npm install runs
- Python requirements installed
- Node.js server starts
- Python FastAPI starts

**T+5-7 minutes**: Health checks start passing
- Application responds to health checks
- Load Balancer marks instances as healthy
- EB environment goes from Red → Yellow → Green

**T+10 minutes**: Fully operational
- New UI accessible at root /
- Shadow paths working at /__aion_shadow/*
- All endpoints responding
- No downtime for users

---

## 🆘 TROUBLESHOOTING

### Still Red after 15 minutes?

1. Check CloudWatch logs for errors
2. Verify environment variables are set
3. Check that GitHub Actions completed successfully
4. Try terminating instances again

### Instances keep failing?

1. Check security groups allow port 80, 443
2. Verify IAM role has proper permissions
3. Check storage space on EC2 (run out of disk?)
4. Look at EB events tab for error messages

### New code not deployed?

1. Make sure latest commits pushed to main branch
2. Manually run: `eb deploy` from command line
3. Check GitHub Actions workflow completed
4. Verify Procfile is correct

---

## 📊 SUCCESS SIGNS

✅ EB shows "Green" health status  
✅ Instances are "InService" in Load Balancer  
✅ `curl https://domain/health` returns 200 OK  
✅ `curl https://domain/__aion_shadow/api/health` returns 200 OK  
✅ UI loads at https://domain/  
✅ No errors in CloudWatch logs  
✅ GitHub Actions shows ✅ passed  

---

## 🎉 DONE!

Your AION v1 deployment is now live with the latest code!

**Next**: Test shadow paths before executing atomic switch
