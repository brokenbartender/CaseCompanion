param(
  [string]$OutDir = "reports/latest-proof-run"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverDir = Join-Path $root "server"

Write-Host "Running proof packet (tests skipped inside packet)..."
$env:PROOF_PACKET_SKIP_TESTS = "1"
$packetPath = & npm --prefix $serverDir run proof:packet
if ($LASTEXITCODE -ne 0) {
  throw "proof:packet failed"
}

$packetPath = ($packetPath | Select-Object -Last 1).Trim()
if (-not (Test-Path $packetPath)) {
  throw "Packet directory not found: $packetPath"
}

Write-Host "Verifying signature..."
& npm --prefix $serverDir run proof:packet:verify -- $packetPath
if ($LASTEXITCODE -ne 0) {
  throw "proof:packet:verify failed"
}

$out = Join-Path $root $OutDir
if (Test-Path $out) {
  Remove-Item -Recurse -Force $out
}
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
Copy-Item -Recurse -Force $packetPath $out

Write-Host "Latest proof run copied to $out"
