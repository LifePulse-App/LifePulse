param(
    [string]$env = "development",
    [string]$appName = "LifePulse-dev"
)

Write-Host "Deploying $appName in $env"

# Use a much simpler PM2_HOME location without spaces or complex paths
$env:PM2_HOME = "C:\pm2\${env}"
Write-Host "PM2_HOME is set to $env:PM2_HOME"

# Ensure the directory exists and is empty
if (Test-Path $env:PM2_HOME) {
    Remove-Item -Recurse -Force $env:PM2_HOME -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $env:PM2_HOME -Force | Out-Null

# Kill all node processes aggressively
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Use a different approach - start directly without PM2 daemon
Write-Host "Starting application directly with PM2 in no-daemon mode..."

try {
    # Try starting with explicit Windows socket configuration
    $env:PM2_SOCKET_PATH = "\\\\.\\pipe\\pm2.sock"
    
    # Start the application
    pm2 start ecosystem.config.js --only $appName --env $env
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Application started successfully"
        pm2 save
        Write-Host "Deploy script finished successfully."
        exit 0
    } else {
        throw "PM2 start failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "PM2 start failed: $_"
    Write-Host "Trying alternative deployment method..."
}

# If PM2 fails, try running the app directly
Write-Host "Attempting to run application directly with Node.js..."

$ecosystem = Get-Content -Raw -Path "ecosystem.config.js" | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($ecosystem -and $ecosystem.apps -and $ecosystem.apps[0]) {
    $appConfig = $ecosystem.apps[0]
    $scriptPath = $appConfig.script
    $nodeArgs = $appConfig.node_args -join " "
    $envVars = $appConfig.env_development
    
    if ($scriptPath -and (Test-Path $scriptPath)) {
        Write-Host "Starting $scriptPath directly with Node.js"
        
        # Set environment variables
        if ($envVars) {
            foreach ($key in $envVars.PSObject.Properties.Name) {
                $env:$key = $envVars.$key
            }
        }
        
        # Start the process
        Start-Process -FilePath "node" -ArgumentList $nodeArgs, $scriptPath -NoNewWindow -Wait
        Write-Host "Application started directly with Node.js"
        exit 0
    }
}

Write-Host "All deployment methods failed"
exit 1
