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
# 1️⃣ Install Backend Dependencies
# -------------------------------------
cd "$NODE_BACKEND_PATH" || { 
    echo "❌ Backend folder not found!"; 
    exit 1; 
}

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

# -------------------------------------
# 2️⃣ Restart Backend
# -------------------------------------
echo "🔄 Restarting Backend..."

pm2 delete "$APP_NAME-dev" >/dev/null 2>&1 || true
pm2 delete "$APP_NAME-prod" >/dev/null 2>&1 || true

if [ "$ENV" == "development" ]; then
    echo "🟢 Starting Development Backend..."
    pm2 start server-dev.js \
        --name "$APP_NAME-dev" \
        --watch
else
    echo "🔵 Starting Production Backend (cluster mode)..."
    pm2 start server-prod.js \
        --name "$APP_NAME-prod" \
        -i max
fi

# -------------------------------------
# 3️⃣ Setup AI Environment
# -------------------------------------
echo "🤖 Preparing AI Environment..."

cd "$AI_PATH" || { 
    echo "❌ AI folder not found!"; 
    exit 1; 
}

# Create virtual environment if missing
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Upgrade pip & install dependencies
echo "📦 Installing AI dependencies..."
./venv/bin/pip install --upgrade pip

if [ -f "requirements.txt" ]; then
    ./venv/bin/pip install -r requirements.txt
else
    echo "⚠️ No requirements.txt found!"
fi

# -------------------------------------
# 4️⃣ Restart AI Model
# -------------------------------------
echo "🔄 Restarting AI Model..."

pm2 delete "$APP_NAME-ai" >/dev/null 2>&1 || true

# IMPORTANT:
# AI models should NOT run in cluster mode unless required.
# Each instance loads model into memory.
# Running single instance is safer.

if [ "$ENV" == "development" ]; then
    echo "🟢 Starting AI Model (development)..."
else
    echo "🔵 Starting AI Model (production)..."
fi

pm2 start main.py \
    --name "$APP_NAME-ai" \
    --interpreter "$AI_PATH/venv/bin/python"

# -------------------------------------
# 5️⃣ Save PM2 State
# -------------------------------------
pm2 save >/dev/null 2>&1

echo "-----------------------------------------"
echo "✅ Deployment completed successfully."
echo "📊 PM2 Status:"
pm2 status
