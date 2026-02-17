#!/bin/bash

ENV=${1:-production}
NODE_BACKEND_PATH="/home/server-pc/StreakSphere/backend"
AI_PATH="/home/server-pc/StreakSphere/ai"
APP_NAME="StreakSphere"

echo "🚀 Deploying $APP_NAME in $ENV mode..."

# 1️⃣ Reset PM2
pm2 delete all >/dev/null 2>&1 || true
sleep 2

# 2️⃣ Install backend deps
cd "$NODE_BACKEND_PATH" || { echo "Backend folder not found!"; exit 1; }
npm install --legacy-peer-deps

# 3️⃣ Start Backend
if [ "$ENV" == "development" ]; then
    echo "🟢 Starting Development Backend..."
    pm2 start server-dev.js \
        --name "$APP_NAME-dev" \
        --instances 1 \
        --exec-mode fork \
        --watch
else
    echo "🔵 Starting Production Backend..."
    pm2 start server-prod.js \
        --name "$APP_NAME-prod" \
        --instances max \
        --exec-mode cluster
fi

# 4️⃣ Start AI (prod only)
if [ "$ENV" == "production" ] && [ -f "$AI_PATH/ai_model.py" ]; then
    echo "🤖 Starting AI Model..."
    pm2 start "$AI_PATH/ai_model.py" \
        --name "$APP_NAME-ai" \
        --interpreter python3 \
        --instances 1
fi

# 5️⃣ Save PM2 state
pm2 save >/dev/null 2>&1

echo "✅ Deployment finished successfully."
