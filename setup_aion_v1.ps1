# AION v1 Remediation - Structural Changes Script
# Run this script to execute the file moves, deletions, and dependencies installation.

Write-Host "Running Phase 0: Cleaning Repo..."

# 0.1 Move markdown files to docs/war-logs/
New-Item -ItemType Directory -Force -Path "docs\war-logs" | Out-Null
$mdFiles = @(
    "URGENT_FIX_BACKEND_DEPLOYMENT.md",
    "ZERO_DOWNTIME_DEPLOYMENT_STATUS.md",
    "STEP_3.6_TO_3.10_DEPLOYMENT.md",
    "SPRINGBOOT_MIGRATION_GUIDE.md",
    "AION_V1_DEPLOYMENT_RUNBOOK.md",
    "PRODUCTION_READY_CHECKLIST.md",
    "PRODUCTION_READY_IMPLEMENTATION.md",
    "QUICK_ACTION_GUIDE.md",
    "QUICK_START.md",
    "SECURITY_SETUP.md"
)
foreach ($file in $mdFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\war-logs\" -Force
    }
}

# 0.2 Delete aion-v2 folder
if (Test-Path "aion-v2") { Remove-Item -Recurse -Force "aion-v2" }

# 0.3 Remove frontend/.env.production securely
git rm --cached frontend\.env.production -q
Out-File -FilePath .gitignore -InputObject "**/.env.production" -Append
Out-File -FilePath .gitignore -InputObject "**/.env.staging" -Append
# Note: git filter-repo requires Python. If it's not installed, skip or run manually:
# git filter-repo --path frontend/.env.production --invert-paths

# 0.4 Delete deceptive UI components
if (Test-Path "frontend\src\components\FileUpload.jsx") { Remove-Item "frontend\src\components\FileUpload.jsx" }
if (Test-Path "frontend\src\components\APIKeyManager.jsx") { Remove-Item "frontend\src\components\APIKeyManager.jsx" }

# 0.6 Pick one deployment target
if (Test-Path ".ebextensions") { Remove-Item -Recurse -Force ".ebextensions" }
if (Test-Path "terraform") { Remove-Item -Recurse -Force "terraform\*.tf" }


Write-Host "Running Phase 1: Installing TypeScript Tooling..."
Set-Location "backend"
# 1.1 Install backend TS tooling
npm install --save-dev typescript @types/node @types/express @types/cors @types/morgan ts-node tsconfig-paths
Set-Location ".."

Set-Location "frontend"
# 1.7 Install frontend TS tooling
npm install --save-dev typescript @types/react @types/react-dom
Set-Location ".."

# Delete legacy JS files (since agent created the TS versions)
$jsFiles = Get-ChildItem -Path "backend\src" -Filter "*.js" -Recurse
foreach ($file in $jsFiles) { Remove-Item $file.FullName }
$jsxFiles = Get-ChildItem -Path "frontend\src" -Filter "*.jsx" -Recurse
foreach ($file in $jsxFiles) { Remove-Item $file.FullName }

Write-Host "Running Phase 3 & 4 & 6: Installing Application Dependencies..."
Set-Location "backend"
npm install zod xss express-rate-limit ioredis bullmq @pinecone-database/pinecone openai multer @aws-sdk/client-s3 @aws-sdk/lib-storage
npm install --save-dev @types/xss @types/ioredis @types/multer
Set-Location ".."

Set-Location "frontend"
npm install crypto-js
npm install --save-dev @types/crypto-js
Set-Location ".."

Write-Host "Remediation Script Complete! Use 'npm run dev' in backend to test."
