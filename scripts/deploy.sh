#!/bin/bash

# -----------------------------
# StreakSphere Deployment Script
# -----------------------------
# Usage: ./deploy.sh [development|production]
# Defaults to production
# -----------------------------

ENV=${1:-production}
NODE_BACKEND_PATH="/home/server-pc/StreakSphere/backend"
AI_PATH="/home/server-pc/StreakSphere/ai"
APP_NAME="StreakSphere"

echo "🚀 Starting deployment of $APP_NAME in $ENV environment..."

# -----------------------------
# 1️⃣ Stop & delete all existing PM2 processes
# -----------------------------
echo "⏹ Stopping and deleting all PM2 processes..."
pm2 delete all || echo "No PM2 processes found."
sleep 2

# -----------------------------
# 2️⃣ Install backend dependencies
# -----------------------------
echo "📦 Installing Node.js backend dependencies..."
cd "$NODE_BACKEND_PATH" || { echo "Backend folder not found!"; exit 1; }
npm install --legacy-peer-deps

# -----------------------------
# 3️⃣ Deploy Node backend
# -----------------------------
if [ "$ENV" == "development" ]; then
    echo "🟢 Deploying Development backend..."
    pm2 start server-dev.js --name "$APP_NAME-dev" --watch
else
    echo "🔵 Deploying Production backend..."
    # Start multiple clustered instances
    pm2 start server-prod.js --name "$APP_NAME-prod" --instances max --exec_mode cluster
fi

# -----------------------------
# 4️⃣ Deploy Python AI model (prod only)
# -----------------------------
if [ -d "$AI_PATH" ] && [ "$ENV" == "production" ]; then
    echo "🤖 Starting Python AI model..."
    pm2 start "$AI_PATH/ai_model.py" --name "$APP_NAME-ai" --interpreter python3
fi

# -----------------------------
# 5️⃣ Save PM2 process list and setup auto-start on boot
# -----------------------------
echo "💾 Saving PM2 process list..."
pm2 save

echo "🔧 Setting up PM2 to auto-start on boot..."
pm2 startup systemd -u server-pc --hp /home/server-pc
# The above command will print another sudo command, run it once manually if needed

# -----------------------------
# 6️⃣ Finished
# -----------------------------
echo "✅ Deployment complete for $APP_NAME in $ENV"
pm2 list
