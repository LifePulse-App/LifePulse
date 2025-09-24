param(
    [string]$env = "production",
    [string]$appName = "LifePulse-prod"
)

Write-Host "Deploying $appName in $env"

# Use a simpler PM2_HOME location
$env:PM2_HOME = "$env:TEMP\pm2-$env"
if (Test-Path $env:PM2_HOME) {
    Remove-Item -Recurse -Force $env:PM2_HOME
}
New-Item -ItemType Directory -Path $env:PM2_HOME | Out-Null

Write-Host "PM2_HOME is set to $env:PM2_HOME"

# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start fresh
pm2 start ecosystem.config.js --only $appName --env $env

if ($LASTEXITCODE -eq 0) {
    pm2 save
    Write-Host "Deploy script finished successfully."
    exit 0
} else {
    Write-Host "Deployment failed."
    exit 1
}
