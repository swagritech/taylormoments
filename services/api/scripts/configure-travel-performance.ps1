param(
  [string]$ResourceGroup = "tailormoments-dev-rg",
  [string]$FunctionAppName = "swagri-tailormoments-api-01",
  [string]$OsrmBaseUrl = "",
  [string]$RedisUrl = "",
  [string]$WarmupToken = "",
  [int]$CacheTtlSeconds = 21600
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OsrmBaseUrl)) {
  throw "OsrmBaseUrl is required."
}

if ([string]::IsNullOrWhiteSpace($RedisUrl)) {
  throw "RedisUrl is required."
}

Write-Host "Applying travel performance app settings..."

$settings = @(
  "TM_TRAVEL_TIME_PROVIDER=osrm",
  "TM_TRAVEL_TIME_OSRM_BASE_URL=$OsrmBaseUrl",
  "TM_TRAVEL_TIME_CACHE_TTL_SECONDS=$CacheTtlSeconds",
  "TM_TRAVEL_TIME_CACHE_BACKEND=redis",
  "TM_TRAVEL_TIME_REDIS_URL=$RedisUrl",
  "TM_TRAVEL_TIME_REDIS_KEY_PREFIX=tm:travel:matrix:v1"
)

if (-not [string]::IsNullOrWhiteSpace($WarmupToken)) {
  $settings += "TM_WARMUP_TOKEN=$WarmupToken"
}

az functionapp config appsettings set `
  --resource-group $ResourceGroup `
  --name $FunctionAppName `
  --settings $settings | Out-Host

Write-Host "Restarting function app..."
az functionapp restart `
  --resource-group $ResourceGroup `
  --name $FunctionAppName | Out-Host

Write-Host "Travel performance settings applied."
