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

# -------------------------------------
# 1️⃣ Reset PM2 completely
# -------------------------------------
# echo "⏹ Resetting PM2..."
# pm2 delete all >/dev/null 2>&1 || true
# sleep 2

# -------------------------------------
# 2️⃣ Install backend dependencies
# -------------------------------------
cd "$NODE_BACKEND_PATH" || { echo "❌ Backend folder not found!"; exit 1; }
echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

# -------------------------------------
# 3️⃣ Start Backend
# -------------------------------------
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
# 4️⃣ Start AI Model
# -------------------------------------
if [ "$ENV" == "development" ]; then
    echo "🤖 Starting AI Model (development)..."
    pm2 start "$AI_PATH/main.py" \
        --name "$APP_NAME-ai" \
        --interpreter python3
else
    echo "🤖 Starting AI Model (production cluster)..."
    pm2 start "$AI_PATH/main.py" \
        --name "$APP_NAME-ai" \
        --interpreter python3 \
        -i max
fi

# -------------------------------------
# 5️⃣ Save PM2 state
# -------------------------------------
pm2 save >/dev/null 2>&1

echo "✅ Deployment completed successfully."