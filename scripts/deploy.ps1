param(
    [string]$env = "production",
    [string]$appName = "LifePulse"
)

Write-Host "🚀 Deploying $appName in $env using PM2..."

# Path to backend folder
$backendPath = "C:\Users\Administrator\actions-runner\_work\LifePulse\LifePulse\backend"

try {
    # Change to backend folder
    Set-Location $backendPath

    # Install dependencies (clean install for CI/CD)
    Write-Host "📦 Installing dependencies..."
    npm ci

    # Pick correct entry file + app name
    if ($env -eq "development") {
        $scriptFile = "server-dev.js"
        $appName = "LifePulse-dev"
    } else {
        $scriptFile = "server-prod.js"
        $appName = "LifePulse-prod"
    }

    # Stop old process safely
    Write-Host "🛑 Stopping old PM2 process for $appName (if exists)..."
    pm2 stop $appName -s || Write-Host "No existing process"

    Start-Sleep -Seconds 2

    # Start new process with updated env
    Write-Host "▶️ Starting $appName with PM2 using $scriptFile..."
    pm2 start $scriptFile --name $appName --update-env

    # Save process list so it auto-restores on restart
    pm2 save

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "❌ Deployment failed: $errMsg"
    exit 1
}
