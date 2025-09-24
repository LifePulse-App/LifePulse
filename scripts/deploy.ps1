param(
  [string]$env = "production",
  [string]$appName = "LifePulse-prod"
)

$pm2 = "C:\nvm4w\nodejs\pm2.cmd"   # absolute path

Write-Host "Deploying $appName in $env"

try {
  & $pm2 describe $appName > $null 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Reloading $appName"
    & $pm2 reload ecosystem.config.js --only $appName --env $env
  } else {
    Write-Host "Starting $appName"
    & $pm2 start ecosystem.config.js --only $appName --env $env
  }
} catch {
  Write-Host "Error checking pm2 process: $_"
  Write-Host "Starting $appName"
  & $pm2 start ecosystem.config.js --only $appName --env $env
}

& $pm2 save
Write-Host "Deploy script finished."
