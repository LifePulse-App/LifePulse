#!/bin/bash
ENV=${1:-production}
APP_NAME="StreakSphere"
BACKEND_PATH="/home/server-pc/StreakSphere/backend"

echo "Deploying $APP_NAME in $ENV using PM2..."

cd $BACKEND_PATH || { echo "Backend folder not found!"; exit 1; }

# Install dependencies
npm install --legacy-peer-deps

# Select script
if [ "$ENV" == "development" ]; then
    SCRIPT_FILE="server-dev.js"
    APP_NAME="$APP_NAME-dev"
else
    SCRIPT_FILE="server-prod.js"
    APP_NAME="$APP_NAME-prod"
fi

# Stop existing PM2 process
pm2 stop "$APP_NAME" --silent
sleep 2

# Start with PM2
pm2 start "$SCRIPT_FILE" --name "$APP_NAME"
pm2 save

echo "✅ $APP_NAME deployed successfully in $ENV"
