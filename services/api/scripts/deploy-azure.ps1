param(
  [string]$ResourceGroup = "tailormoments-dev-rg",
  [string]$FunctionAppName = "swagri-tailormoments-api-01"
)

$ErrorActionPreference = "Stop"

Write-Host "Building API..."
npm run build | Out-Host

Write-Host "Preparing release folder..."
npm run package:azure | Out-Host

$repoRoot = Split-Path -Parent $PSScriptRoot
$releasePath = Join-Path $repoRoot "release"
if (-not (Test-Path $releasePath)) {
  throw "Release folder not found at $releasePath"
}

$zipPath = Join-Path $env:TEMP ("tm-api-deploy-" + [guid]::NewGuid().ToString() + ".zip")
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Write-Host "Creating deployment zip..."
Compress-Archive -Path (Join-Path $releasePath "*") -DestinationPath $zipPath -Force

Write-Host "Deploying to Azure Function App $FunctionAppName..."
az functionapp deployment source config-zip `
  --name $FunctionAppName `
  --resource-group $ResourceGroup `
  --src $zipPath | Out-Host

$subscriptionId = az account show --query id -o tsv
if (-not $subscriptionId) {
  throw "Unable to read Azure subscription id from current az login."
}

Write-Host "Syncing function triggers..."
az rest `
  --method post `
  --uri "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Web/sites/$FunctionAppName/syncfunctiontriggers?api-version=2022-03-01" | Out-Host

Write-Host "Deployment complete."
