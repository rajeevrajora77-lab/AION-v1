#!/bin/bash
set -e

ENV=$1

if [ "$ENV" == "prod" ]; then
  BUCKET="rajora.co.in"
else
  BUCKET="dev.rajora.co.in"
fi

echo "Deploying to $ENV..."

aws s3 sync frontend/dist/ s3://$BUCKET/ --delete

# Invalidate CloudFront cache (optional)
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*"
  echo "✅ CloudFront cache invalidated"
else
  echo "ℹ️  No CloudFront distribution configured, skipping cache invalidation"
fi
echo "✅ Deployment complete"
