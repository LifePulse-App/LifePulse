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

# Cleanup function to handle PM2 permission issues
function Reset-PM2 {
    Write-Host "Attempting to reset PM2 daemon..."
    
    try {
        # Try to kill existing PM2 processes gracefully
        pm2 kill 2>&1 | Out-Null
    } catch {
        Write-Host "PM2 kill failed, continuing with cleanup..."
    }
    
    # Kill any orphaned Node.js processes that might be holding the socket
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
        $_.ProcessName -eq "node" 
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Remove the PM2 home directory to clear any corrupted state
    if (Test-Path $env:PM2_HOME) {
        try {
            Remove-Item -Recurse -Force "$env:PM2_HOME\*" -ErrorAction SilentlyContinue
            Write-Host "Cleaned PM2 home directory"
        } catch {
            Write-Host "Warning: Could not fully clean PM2 home directory"
        }
    }
}

# Function to start or reload PM2 app with error handling
function Start-Or-ReloadApp {
    param(
        [string]$appName,
        [string]$env
    )

    $maxRetries = 3
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            Write-Host "Attempting PM2 operation (attempt $($retryCount + 1))..."
            
            # Check if app exists
            pm2 describe $appName 2>&1 | Out-Null
            $appExists = $LASTEXITCODE -eq 0
            
            if ($appExists) {
                Write-Host "Reloading $appName"
                pm2 reload ecosystem.config.js --only $appName --env $env
            } else {
                Write-Host "Starting $appName"
                pm2 start ecosystem.config.js --only $appName --env $env
            }
            
            # If we get here without exception, break the retry loop
            if ($LASTEXITCODE -eq 0) {
                Write-Host "PM2 operation completed successfully"
                return $true
            } else {
                throw "PM2 command failed with exit code $LASTEXITCODE"
            }
            
        } catch {
            Write-Host "Error with PM2: $($_.Exception.Message)"
            $retryCount++
            
            if ($retryCount -lt $maxRetries) {
                Write-Host "Retrying in 3 seconds..."
                Start-Sleep -Seconds 3
                
                # Reset PM2 on retry
                Reset-PM2
            } else {
                Write-Host "All retry attempts failed"
                return $false
            }
        }
    }
}

# Main deployment logic
Write-Host "Starting deployment process..."

# Initial PM2 reset to ensure clean state
Reset-PM2

# Wait a moment for cleanup to complete
Start-Sleep -Seconds 2

# Run deployment with retry logic
$deploymentSuccess = Start-Or-ReloadApp -appName $appName -env $env

if ($deploymentSuccess) {
    # Save PM2 process list
    try {
        pm2 save
        Write-Host "PM2 process list saved successfully"
        
        # Display status for verification
        pm2 status
    } catch {
        Write-Host "Warning: Could not save PM2 process list: $_"
    }
    
    Write-Host "Deploy script finished successfully."
    exit 0
} else {
    Write-Host "Deployment failed after multiple attempts."
    
    # Final attempt with --no-daemon flag as last resort
    Write-Host "Attempting final deployment with --no-daemon flag..."
    try {
        pm2 start ecosystem.config.js --only $appName --env $env --no-daemon
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Deployment succeeded with --no-daemon flag"
            exit 0
        }
    } catch {
        Write-Host "Final deployment attempt also failed: $_"
    }
    
    exit 1
}
