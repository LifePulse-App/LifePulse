param(
  [string]$env = "production",
  [string]$appName = "LifePulse"
)

Write-Host "Deploying $appName in $env..."

# Path to backend folder
$backendPath = "C:\actions-runner\_work\LifePulse\LifePulse\backend"

try {
    # Stop existing Node.js processes
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

    # Start app in a NEW CMD window
    Write-Host "Starting $appName in a new CMD window..."
    if ($env -eq "production") {
        Start-Process "cmd.exe" "/k cd /d `"$backendPath`" && npm run dev"
    } else {
        Start-Process "cmd.exe" "/k cd /d `"$backendPath`" && npm run dev"
    }

    Write-Host "✅ $appName deployed successfully in $env"
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying $errMsg"
    exit 1
}
