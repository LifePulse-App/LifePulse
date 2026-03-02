#!/bin/bash

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
    echo "❌ Backend folder not found!"
    exit 1
}

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

# -------------------------------------
# 2️⃣ Restart backend (only target env)
# -------------------------------------
echo "🔄 Restarting Backend..."

if [ "$ENV" == "development" ]; then
    TARGET_NAME="$APP_NAME-dev"
    TARGET_SCRIPT="server-dev.js"
else
    TARGET_NAME="$APP_NAME-prod"
    TARGET_SCRIPT="server-prod.js"
fi

# Delete only the process being deployed
pm2 delete "$TARGET_NAME" >/dev/null 2>&1 || true

# Start selected environment
pm2 start "$TARGET_SCRIPT" --name "$TARGET_NAME" -i max

# -------------------------------------
# 3️⃣ Prepare AI Environment
# -------------------------------------
cd "$AI_PATH" || {
    echo "❌ AI folder not found!"
    exit 1
}

echo "🐍 Preparing Python environment..."

# Create venv if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Upgrade pip
./venv/bin/pip install --upgrade pip

# Detect GPU
echo "🔍 Checking for GPU..."
if ./venv/bin/python -c "import torch; exit(0)"; then
    echo "⚠️ Torch already installed, skipping torch install."
else
    if command -v nvidia-smi >/dev/null 2>&1; then
        echo "🔥 GPU detected. Installing CUDA PyTorch..."
        ./venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
    else
        echo "💻 No GPU detected. Installing CPU PyTorch..."
        ./venv/bin/pip install torch torchvision
    fi
fi

# Install remaining requirements
if [ -f "requirements.txt" ]; then
    echo "📦 Installing AI dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

# -------------------------------------
# 4️⃣ Restart AI Model
# -------------------------------------
echo "🔄 Restarting AI Model..."

pm2 delete "$APP_NAME-ai" >/dev/null 2>&1 || true

# Kill anything using port 8000
sudo fuser -k 8000/tcp >/dev/null 2>&1 || true

pm2 start ./venv/bin/python \
    --name "$APP_NAME-ai" \
    --cwd "$AI_PATH" \
    -- -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2

# -------------------------------------
# 5️⃣ Save PM2 State
# -------------------------------------
pm2 save >/dev/null 2>&1

echo "-----------------------------------------"
echo "✅ Deployment completed successfully."
pm2 status