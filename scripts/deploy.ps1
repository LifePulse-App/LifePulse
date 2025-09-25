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

    # Install dependencies
    Write-Host "Installing dependencies..."
    npm install --legacy-peer-deps

    # Stop old processes
    Write-Host "Stopping old PM2 processes..."
    pm2 delete LifePulse-dev -s
    pm2 delete LifePulse-prod -s
    Start-Sleep -Seconds 2

    # Determine script file
    if ($env -eq "development") {
        $scriptFile = "server-dev.js"
        $appName = "LifePulse-dev"
    } else {
        $scriptFile = "server-prod.js"
        $appName = "LifePulse-prod"
    }

    # Start PM2 directly on JS file
    Write-Host "Starting $appName with PM2 using $scriptFile..."
    pm2 start $scriptFile --name $appName

    # Save PM2 process list
    pm2 save

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying: $errMsg"
    exit 1
}
