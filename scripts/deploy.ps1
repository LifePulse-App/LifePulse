param(
    [string]$env = "production",
    [string]$appName = "LifePulse-prod"
)

Write-Host "Deploying $appName in $env"

# Use PM2_HOME from environment (set by GitHub Actions workflow)
if (-not $env:PM2_HOME) {
    $env:PM2_HOME = "$PWD\.pm2"
    if (-not (Test-Path $env:PM2_HOME)) {
        New-Item -ItemType Directory -Path $env:PM2_HOME | Out-Null
    }
}

Write-Host "PM2_HOME is set to $env:PM2_HOME"

# Ensure PATH includes npm global bin (so pm2 command works)
$env:PATH += ";" + (Split-Path (Get-Command npm).Source)

# Function to start or reload PM2 app
function Start-Or-ReloadApp {
    param(
        [string]$appName,
        [string]$env
    )

    try {
        pm2 describe $appName > $null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Reloading $appName"
            pm2 reload ecosystem.config.js --only $appName --env $env
        } else {
            Write-Host "Starting $appName"
            pm2 start ecosystem.config.js --only $appName --env $env
        }
    } catch {
        Write-Host "Error with PM2: $_"
        Write-Host "Attempting to start $appName"
        pm2 start ecosystem.config.js --only $appName --env $env
    }
}

# Run deployment
Start-Or-ReloadApp -appName $appName -env $env

# Save PM2 process list
pm2 save

Write-Host "Deploy script finished."
