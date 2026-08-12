#!/bin/bash

ENV=${1:-production}
BASE_PATH="/home/server-pc/actions-runner/_work/StreakSphere/StreakSphere"
NODE_BACKEND_PATH="$BASE_PATH/backend"
AI_PATH="$BASE_PATH/ai"
PROJECT_ROOT="$BASE_PATH"
APP_NAME="StreakSphere"

# 🔒 Define where your permanent secrets live on the server
SECRETS_VAULT="/home/server-pc/secrets/StreakSphere"

echo "🚀 Deploying $APP_NAME in $ENV mode..."
echo "-----------------------------------------"

# -------------------------------------
# 1️⃣ Inject Secrets
# -------------------------------------
echo "🔐 Injecting secure environment files..."

# Copy both environment files and the Firebase key exactly as named
cp "$SECRETS_VAULT/.env.development" "$NODE_BACKEND_PATH/.env.development"
cp "$SECRETS_VAULT/.env.production" "$NODE_BACKEND_PATH/.env.production"
cp "$SECRETS_VAULT/serviceAccountKey.json" "$NODE_BACKEND_PATH/serviceAccountKey.json"

echo "✅ Injected .env.development, .env.production, and serviceAccountKey.json"

# -------------------------------------
# 2️⃣ Install backend dependencies
# -------------------------------------
cd "$NODE_BACKEND_PATH" || {
    echo "❌ Backend folder not found!"
    exit 1
}

echo "📦 Installing backend dependencies..."
npm install --legacy-peer-deps

# -------------------------------------
# 3️⃣ Restart backend (only target env)
# -------------------------------------
echo "🔄 Restarting Backend..."

cd "$PROJECT_ROOT" || {
    echo "❌ Project root not found!"
    exit 1
}

if [ "$ENV" == "development" ]; then
    APPS="StreakSphere-dev-1,StreakSphere-dev-2"
else
    APPS="StreakSphere-prod-1,StreakSphere-prod-2,StreakSphere-prod-3,StreakSphere-prod-4,StreakSphere-prod-5,StreakSphere-prod-6,StreakSphere-prod-7,StreakSphere-prod-8,StreakSphere-prod-9,StreakSphere-prod-10,StreakSphere-prod-11,StreakSphere-prod-12"
fi

FIRST_APP=$(echo "$APPS" | cut -d',' -f1)

if pm2 describe "$FIRST_APP" >/dev/null 2>&1; then
    echo "♻️ Reloading existing PM2 apps..."
    pm2 reload ecosystem.config.js --only "$APPS" --update-env
else
    echo "🚀 Starting PM2 apps..."
    pm2 start ecosystem.config.js --only "$APPS"
fi

# -------------------------------------
# 4️⃣ Prepare AI Environment
# -------------------------------------
cd "$AI_PATH" || {
    echo "❌ AI folder not found!"
    exit 1
}

echo "🐍 Preparing Python environment..."

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "⬆️ Upgrading pip..."
./venv/bin/pip install --upgrade pip

echo "🔍 Checking for PyTorch..."

if ./venv/bin/python -c "import torch" >/dev/null 2>&1; then
    echo "✅ PyTorch already installed."
else
    if command -v nvidia-smi >/dev/null 2>&1; then
        echo "🔥 GPU detected. Installing CUDA PyTorch..."
        ./venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
    else
        echo "💻 No GPU detected. Installing CPU PyTorch..."
        ./venv/bin/pip install torch torchvision
    fi
fi

if [ -f "requirements.txt" ]; then
    echo "📦 Installing AI dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

# -------------------------------------
# 5️⃣ Restart AI Model
# -------------------------------------
echo "🔄 Restarting AI Model..."

if pm2 describe "$APP_NAME-ai" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME-ai"
else
    pm2 start ./venv/bin/python \
        --name "$APP_NAME-ai" \
        --cwd "$AI_PATH" \
        -- -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
fi

# -------------------------------------
# 6️⃣ Save PM2 State
# -------------------------------------
echo "💾 Saving PM2 state..."
pm2 save >/dev/null 2>&1

echo "-----------------------------------------"
echo "✅ Deployment completed successfully."

pm2 status