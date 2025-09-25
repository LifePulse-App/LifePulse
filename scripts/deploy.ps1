param(
    [string]$env = "development",
    [string]$appName = "LifePulse-dev"
)

Write-Host "Deploying $appName in $env using Windows Task Scheduler..."

try {
    # Stop task if running
    Write-Host "Stopping existing task if running..."
    schtasks /End /TN $appName /F | Out-Null

    Start-Sleep -Seconds 2

    # Start task
    Write-Host "Starting task $appName..."
    schtasks /Run /TN $appName

    # Optional: Wait for health check
    $url = "http://localhost:4000/health"
    $maxRetries = 10
    $retry = 0
    $success = $false

    while ($retry -lt $maxRetries -and -not $success) {
        Start-Sleep -Seconds 2
        try {
            $resp = Invoke-WebRequest $url -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) {
                $success = $true
                Write-Host "✅ $appName is running and healthy!"
            }
        } catch {}
        $retry++
    }

    if (-not $success) {
        Write-Error "❌ $appName did not respond to health check at $url"
        exit 1
    }
}
catch {
    $errMsg = $_.Exception.Message
    Write-Error "Error deploying $appName: $errMsg"
    exit 1
}
