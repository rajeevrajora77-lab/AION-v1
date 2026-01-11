#!/bin/bash
# AWS EB Deployment Fix - Terminates stale instances
# This forces Auto Scaling Group to launch fresh EC2 instances
# with latest code from GitHub

set -e

echo "AWS EB Deployment Fix - AION v1"
echo "================================"
echo ""
echo "⚠️  IMPORTANT: Run this from your local machine with AWS CLI configured"
echo ""

# Configuration - CHANGE THESE
EB_ENV="aion-backend-env"
AWS_REGION="us-east-1"

echo "Step 1: Get Auto Scaling Group..."
ASG=$(aws elasticbeanstalk describe-environment-resources \\  
  --environment-name $EB_ENV \\  
  --region $AWS_REGION \\  
  --query 'EnvironmentResources.AutoScalingGroups[0].Name' \\  
  --output text)

echo "Found ASG: $ASG"
echo ""

echo "Step 2: List EC2 instances..."
INSTANCES=$(aws autoscaling describe-auto-scaling-groups \\  
  --auto-scaling-group-names $ASG \\  
  --region $AWS_REGION \\  
  --query 'AutoScalingGroups[0].Instances[*].InstanceId' \\  
  --output text)

echo "Instances: $INSTANCES"
echo ""

echo "Step 3: TERMINATE instances (ASG will launch new ones)..."
for INSTANCE in $INSTANCES; do
  echo "Terminating: $INSTANCE"
  aws ec2 terminate-instances --instance-ids $INSTANCE --region $AWS_REGION
done

echo ""
echo "✅ Instances terminated"
echo "Auto Scaling Group will launch new instances within 2 minutes"
echo "GitHub Actions will deploy latest code"
echo ""
echo "Monitor in AWS Console: ElasticBeanstalk > Environments > Health"
echo "Expected time to healthy: 5-10 minutes"
