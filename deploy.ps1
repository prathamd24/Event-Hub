# College Event Hub - Full Deployment Script
# Run this from the project root directory

$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\Pratham Kumar\OneDrive\Desktop\Colleg-event-hub\college-event-hub"
$FrontendDir = "$ProjectRoot\frontend"

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  COLLEGE EVENT HUB - FULL DEPLOYMENT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ── STEP 1: Git Push ──────────────────────────────────────────────────────────
Write-Host "`n[STEP 1/3] Pushing code to GitHub..." -ForegroundColor Yellow
Set-Location $ProjectRoot

git add -A
$status = git status --porcelain
if ($status) {
    git commit -m "feat: Instagram link on club profile + gallery upload for coordinators"
    Write-Host "Committed changes." -ForegroundColor Green
} else {
    Write-Host "Nothing new to commit - all changes already committed." -ForegroundColor Gray
}

git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: git push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Code pushed to GitHub. Render will auto-deploy the backend." -ForegroundColor Green
Write-Host "     Backend URL: https://event-hub-backend-cwr3.onrender.com" -ForegroundColor Gray

# ── STEP 2: Build Frontend ────────────────────────────────────────────────────
Write-Host "`n[STEP 2/3] Building React frontend..." -ForegroundColor Yellow
Set-Location $FrontendDir

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm build failed! Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Frontend built successfully (dist/ folder ready)." -ForegroundColor Green

# ── STEP 3: Firebase Deploy ───────────────────────────────────────────────────
Write-Host "`n[STEP 3/3] Deploying to Firebase Hosting..." -ForegroundColor Yellow

# Check if firebase CLI is installed
$firebaseCheck = Get-Command firebase -ErrorAction SilentlyContinue
if (-not $firebaseCheck) {
    Write-Host "Firebase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install firebase-tools!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Firebase CLI installed. You may need to run 'firebase login' manually." -ForegroundColor Yellow
}

firebase deploy --only hosting --project event-hub-8fe51
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Firebase deploy failed!" -ForegroundColor Red
    Write-Host "If you see an auth error, run: firebase login" -ForegroundColor Yellow
    Write-Host "Then re-run this script." -ForegroundColor Yellow
    exit 1
}

# ── DONE ──────────────────────────────────────────────────────────────────────
Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "`n Frontend (Firebase): https://event-hub-8fe51.web.app" -ForegroundColor Cyan
Write-Host " Backend  (Render):   https://event-hub-backend-cwr3.onrender.com" -ForegroundColor Cyan
Write-Host "`n NOTE: Render backend may take 3-5 minutes to fully restart." -ForegroundColor Yellow
Write-Host " You can monitor it at: https://dashboard.render.com`n" -ForegroundColor Yellow

Read-Host "Press Enter to exit"
