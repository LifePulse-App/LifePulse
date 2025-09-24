param(
  [string]$env = "production",
  [string]$appName = "LifePulse",
  [string]$port = "4000" # Change if your backend runs on a different port
)

Write-Host "Deploying $appName in $env..."

# Path to your app entry point
$appPath = "C:\actions-runner\_work\LifePulse\LifePulse\backend\server.js"

try {
    # Stop existing app if running
    Write-Host "Stopping existing processes for $appName..."
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.Path -like "*node.exe") {
            try {
                Stop-Process -Id $_.Id -Force
                Write-Host "Stopped Node process with PID $($_.Id)"
            } catch {
                Write-Host "Could not stop process: $($_.Id)"
            }
        }
    }

    Start-Sleep -Seconds 2

    # Start the app in a NEW CMD window and keep it open
    Write-Host "Starting $appName in a new CMD window..."
    Start-Process "cmd.exe" "/k cd `"$($appPath | Split-Path)`" ^&^& npm run dev"

    # Wait a bit before checking health
    Write-Host "Waiting for $appName to boot..."
    Start-Sleep -Seconds 8

    # Health check
    $healthUrl = "http://localhost:$port/"
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $appName is running and passed health check at $healthUrl"
        } else {
            Write-Error "❌ $appName started but health check failed with status $($response.StatusCode)"
            exit 1
        }
    } catch {
        Write-Error "❌ $appName did not respond to health check at $healthUrl"
        exit 1
    }

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying $errMsg"
    exit 1
}
