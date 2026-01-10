#!/bin/bash
set -e

echo "Verifying build..."

if [ ! -d "dist" ] && [ ! -d "build" ]; then
  echo "❌ Build output not found"
  exit 1
fi

echo "✅ Build verified"
