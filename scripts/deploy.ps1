param(
    [string]$env = "production",
    [string]$appName = "LifePulse-dev"
)

# Name of the scheduled task (must match what you created in Task Scheduler)
$taskName = $appName

Write-Host "Deploying $appName in $env using Windows Task Scheduler..."

try {
    # Stop the task if it's already running
    Write-Host "Stopping existing task if running..."
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

    # Start the task
    Write-Host "Starting task $taskName..."
    Start-ScheduledTask -TaskName $taskName

    Write-Host "Deployment of $appName completed successfully."
} catch {
    Write-Error "Error deploying ${appName}: $($_)"
    exit 1
}
