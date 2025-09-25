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

    # Determine npm script
    if ($env -eq "development") {
        $npmScript = "dev"
    } else {
        $npmScript = "prod"
    }

    # Start with PM2
    Write-Host "Starting $appName with PM2 using npm run $npmScript..."
    pm2 start "$env:APPDATA\nvm\npm.cmd" --name $appName -- run $npmScript

    # Save PM2 process list
    pm2 save

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying: $errMsg"
    exit 1
}
