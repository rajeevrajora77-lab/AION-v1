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

aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Deployment complete"
