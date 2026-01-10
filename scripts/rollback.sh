#!/bin/bash
set -e

TAG=$1

if [ -z "$TAG" ]; then
  echo "❌ Usage: ./rollback.sh <git-tag>"
  exit 1
fi

echo "🔄 Rolling back to $TAG..."

git fetch --all --tags
git checkout $TAG

npm install
npm run build

bash scripts/deploy.sh prod

echo "✅ Rollback to $TAG completed"
