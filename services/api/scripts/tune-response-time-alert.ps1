param(
  [string]$ResourceGroup = "tailormoments-dev-rg",
  [string]$AlertName = "tm-api-response-time-high",
  [double]$ThresholdSeconds = 5
)

$ErrorActionPreference = "Stop"

Write-Host "Updating Azure Monitor alert threshold to $ThresholdSeconds seconds..."

az monitor metrics alert update `
  --resource-group $ResourceGroup `
  --name $AlertName `
  --set criteria.allOf[0].threshold=$ThresholdSeconds | Out-Host

Write-Host "Updated alert threshold."
