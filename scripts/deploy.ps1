param(
  [string]$env = "production",
  [string]$appName = "LifePulse"
)

Write-Host "Deploying $appName in $env using PM2..."

# Path to backend folder
$backendPath = "C:\Users\Administrator\actions-runner\_work\LifePulse\LifePulse\backend"

try {
    # Change to backend folder
    Set-Location $backendPath

    # Install dependencies if needed
    Write-Host "Installing dependencies..."
    npm install --legacy-peer-deps

    # Stop old process (if running)
    Write-Host "Stopping old process (if exists)..."
    pm2 delete $appName -s

    # Start with PM2
    Write-Host "Starting $appName with PM2..."
    pm2 start server.js --name $appName

    # Save PM2 process list for auto-restart on reboot
    pm2 save

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying $errMsg"
    exit 1
}
