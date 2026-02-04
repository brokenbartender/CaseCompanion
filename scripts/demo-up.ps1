param(
  [string]$GeminiApiKey
)

# Safe port cleaning to avoid killing the host shell
Write-Host "Checking for occupied ports (3001, 5173, 5432, 8787)..." -ForegroundColor Cyan
$targetPorts = @(3001, 5173, 5432, 8787)
foreach ($port in $targetPorts) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    $procId = $conn.OwningProcess
    # Don't kill self, System (0/4), or critical wrappers
    if ($procId -ne $PID -and $procId -gt 4) {
      try {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc) {
          if ($proc.ProcessName -match '^(?i)(code|code-insiders|vscode|cursor|codium)$') {
            continue
          }
          Write-Host "Freeing port $port (PID: $procId - $($proc.ProcessName))..." -ForegroundColor Yellow
          Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
      } catch {
        Write-Warning "Could not stop process $procId on port $port"
      }
    }
  }
}

$setup = Join-Path $PSScriptRoot "setup-env.ps1"
& $setup -GeminiApiKey $GeminiApiKey
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

try {
  docker compose up --build --force-recreate --remove-orphans
} catch {
  docker-compose up --build --force-recreate --remove-orphans
}
