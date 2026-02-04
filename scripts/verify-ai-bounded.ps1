param(
  [int]$TimeoutSec = 130
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $ScriptDir "..")
$server = Join-Path $repo "server"
$demoPdf = Join-Path $repo "docs\\LexiPro_Demo_Exhibit.pdf"
$envFile = Join-Path $server ".env"

function Read-EnvFile {
  param([string]$Path)
  $result = @{}
  if (-not (Test-Path $Path)) { return $result }
  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $parts = $trimmed -split "=", 2
    if ($parts.Count -lt 2) { continue }
    $key = $parts[0].Trim()
    $value = $parts[1]
    if ($key) { $result[$key] = $value }
  }
  return $result
}

$envFromFile = Read-EnvFile -Path $envFile
$demoEmail = if ($env:SEED_DEMO_EMAIL) { $env:SEED_DEMO_EMAIL } else { $envFromFile["SEED_DEMO_EMAIL"] }
$demoPassword = if ($env:SEED_DEMO_PASSWORD) { $env:SEED_DEMO_PASSWORD } else { $envFromFile["SEED_DEMO_PASSWORD"] }
if (-not $demoEmail) { $demoEmail = "demo@lexipro.local" }
if (-not $demoPassword) { $demoPassword = "demo1234" }

function Stop-ServerOnPort {
  param([int]$Port)
  $processId = (netstat -ano | findstr ":$Port" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
  if ($processId) {
    taskkill /PID $processId /F /T | Out-Null
  }
}

function Wait-PortFree {
  param([int]$Port)
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Date) -lt $deadline) {
    $listeningPid = (netstat -ano | findstr ":$Port" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
    if (-not $listeningPid) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Start-Server {
  param([hashtable]$Env)
  foreach ($key in $Env.Keys) {
    Set-Item -Path "env:$key" -Value $Env[$key]
  }
  Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $server -NoNewWindow | Out-Null
  Start-Sleep -Seconds 3
}

function Wait-ServerReady {
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    try {
      irm http://localhost:8787/api/health -TimeoutSec 3 | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  return $false
}

function Login {
  $body = @{ email = $demoEmail; password = $demoPassword } | ConvertTo-Json -Compress
  $login = irm http://localhost:8787/api/auth/login -Method POST -ContentType "application/json" -Body $body -TimeoutSec $TimeoutSec
  return @{ token = $login.token; wid = $login.workspaceId }
}

function SeedDemo {
  param([hashtable]$Headers)
  irm http://localhost:8787/api/demo/seed -Method POST -Headers $Headers -TimeoutSec $TimeoutSec | Out-String
}

function CallAi {
  param([hashtable]$Headers)
  $payload = @{ promptKey = "forensic_synthesis"; messages = @(@{ role="user"; content="lexipro" }) } | ConvertTo-Json -Depth 6
  irm http://localhost:8787/api/ai/chat -Method POST -Headers $Headers -ContentType "application/json" -Body $payload -TimeoutSec $TimeoutSec |
    ConvertTo-Json -Depth 6
}

Write-Host "== Normal mode (OLLAMA up) =="
Stop-ServerOnPort -Port 8787
Wait-PortFree -Port 8787 | Out-Null

Start-Server -Env @{
  OLLAMA_URL = "http://localhost:11434"
  AI_FALLBACK_MODE = "false"
  OLLAMA_MODEL = "phi3:latest"
  AI_REQUEST_TIMEOUT_MS = "120000"
  AI_MAX_FINDINGS = "1"
  AI_MAX_ANCHORS = "5"
  AI_MAX_CONTEXT_CHARS = "8000"
  DEMO_SEED_ENABLED = "true"
  DEMO_EXHIBIT_PATH = $demoPdf
}

if (-not (Wait-ServerReady)) { throw "Server did not become ready in time." }
$auth = Login
$headers = @{ Authorization = "Bearer $($auth.token)"; "x-workspace-id" = $auth.wid }
SeedDemo -Headers $headers | Out-Host

try {
  CallAi -Headers $headers | Out-Host
} catch {
  $_.ErrorDetails.Message | Out-Host
}

Write-Host "== Ollama down (expect bounded error) =="
Stop-ServerOnPort -Port 8787
Wait-PortFree -Port 8787 | Out-Null

Start-Server -Env @{
  OLLAMA_URL = "http://localhost:11435"
  AI_FALLBACK_MODE = "false"
  OLLAMA_MODEL = "phi3:latest"
  AI_REQUEST_TIMEOUT_MS = "120000"
  AI_MAX_FINDINGS = "1"
  AI_MAX_ANCHORS = "5"
  AI_MAX_CONTEXT_CHARS = "8000"
  DEMO_SEED_ENABLED = "true"
  DEMO_EXHIBIT_PATH = $demoPdf
}

if (-not (Wait-ServerReady)) { throw "Server did not become ready in time." }
$auth = Login
$headers = @{ Authorization = "Bearer $($auth.token)"; "x-workspace-id" = $auth.wid }
try {
  CallAi -Headers $headers | Out-Host
} catch {
  $_.ErrorDetails.Message | Out-Host
}
