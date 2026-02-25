#!/bin/bash

# =====================================
# StreakSphere Deployment Script
# Usage: ./deploy.sh [development|production]
# Default: production
# =====================================

ENV=${1:-production}
BASE_PATH="/home/server-pc/actions-runner/_work/StreakSphere/StreakSphere"
NODE_BACKEND_PATH="$BASE_PATH/backend"
AI_PATH="$BASE_PATH/ai"
APP_NAME="StreakSphere"

echo "🚀 Deploying $APP_NAME in $ENV mode..."
echo "-----------------------------------------"

# -------------------------------------
# 1️⃣ Install backend dependencies
# -------------------------------------
cd "$NODE_BACKEND_PATH" || { 
    echo "❌ Backend folder not found!"; 
    exit 1; 
}

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

# -------------------------------------
# 2️⃣ Restart backend
# -------------------------------------
echo "🔄 Restarting Backend..."

pm2 delete "$APP_NAME-dev" >/dev/null 2>&1 || true
pm2 delete "$APP_NAME-prod" >/dev/null 2>&1 || true

if [ "$ENV" == "development" ]; then
    pm2 start server-dev.js --name "$APP_NAME-dev" --watch
else
    pm2 start server-prod.js --name "$APP_NAME-prod" -i max
fi

# -------------------------------------
# 3️⃣ Prepare AI Environment
# -------------------------------------
cd "$AI_PATH" || { 
    echo "❌ AI folder not found!"; 
    exit 1; 
}

# Create virtual environment if missing
# if [ ! -d "venv" ]; then
#     echo "📦 Creating Python virtual environment..."
#     python3 -m venv venv
# fi

# Activate venv and install dependencies
echo "📦 Installing AI dependencies..."
source venv/bin/activate
# pip install --upgrade pip
# if [ -f "requirements.txt" ]; then
#     pip install -r requirements.txt
# else
#     pip install fastapi uvicorn
# fi

# deactivate  # optional, PM2 will use the full path

# -------------------------------------
# 4️⃣ Start AI Model
# -------------------------------------
echo "🔄 Restarting AI Model..."
pm2 delete "$APP_NAME-ai" >/dev/null 2>&1 || true

# Start with venv Python explicitly
pm2 start "./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000" \
    --name "$APP_NAME-ai" \
    --cwd "$AI_PATH"

# -------------------------------------
# 5️⃣ Save PM2 State
# -------------------------------------
pm2 save >/dev/null 2>&1

echo "-----------------------------------------"
echo "✅ Deployment completed successfully."
pm2 status
