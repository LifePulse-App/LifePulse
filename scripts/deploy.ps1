param(
  [string]$env = "production",
  [string]$appName = "LifePulse"
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
    Start-Process "cmd.exe" "/k node `"$appPath`""

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying $errMsg"
    exit 1
}
