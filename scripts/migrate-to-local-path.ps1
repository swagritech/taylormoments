param(
  [string]$SourcePath = "C:\Users\seanm\OneDrive - Southwest Agri-Tech Pty Ltd\tailormoments",
  [string]$TargetPath = "C:\dev\tailormoments"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SourcePath)) {
  throw "Source path not found: $SourcePath"
}

if (-not (Test-Path (Split-Path -Parent $TargetPath))) {
  New-Item -ItemType Directory -Path (Split-Path -Parent $TargetPath) -Force | Out-Null
}

Write-Host "Copying repository to $TargetPath ..."
robocopy $SourcePath $TargetPath /MIR /R:1 /W:1 /XD "apps\web\.next" "apps\web\node_modules" "services\api\node_modules" "services\api\release" "services\api\dist" | Out-Null

if (-not (Test-Path (Join-Path $TargetPath ".git"))) {
  throw "Copy completed but .git folder is missing in target path."
}

Write-Host "Repository copied successfully."
Write-Host "Next:"
Write-Host "1) Close dev terminals using the OneDrive path."
Write-Host "2) Open new terminal at: $TargetPath"
Write-Host "3) Run: npm install --prefix apps/web"
Write-Host "4) Run: npm install --prefix services/api"
