$cacheArchive = "scripts/cache/npm-cache.zip"

function Fail([string]$message) {
  Write-Error $message
  exit 1
}

if (-not (Test-Path $cacheArchive)) {
  Fail "Missing offline archive: $cacheArchive. Create it from the npm cache and place it in scripts/cache/."
}

$cachePath = (npm config get cache).Trim()
if (-not $cachePath) {
  Fail "Unable to resolve npm cache path."
}

if (-not (Test-Path $cachePath)) {
  New-Item -ItemType Directory -Path $cachePath | Out-Null
}

Write-Host "Restoring npm cache..."
Expand-Archive -Path $cacheArchive -DestinationPath $cachePath -Force
Write-Host "PASS: npm cache restored to $cachePath"

if (Test-Path "node_modules") {
  Remove-Item -Recurse -Force "node_modules"
}
if (Test-Path "server\\node_modules") {
  Remove-Item -Recurse -Force "server\\node_modules"
}
Write-Host "PASS: old node_modules removed"

Write-Host "Installing root dependencies (offline)..."
& npm ci --offline --no-audit
if ($LASTEXITCODE -ne 0) { Fail "Root npm ci failed." }
Write-Host "PASS: root npm ci"

Write-Host "Installing server dependencies (offline)..."
Push-Location "server"
& npm ci --offline --no-audit
if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Server npm ci failed." }
Pop-Location
Write-Host "PASS: server npm ci"

Write-Host "Offline dependencies restored. You can now run npm scripts without network access."
