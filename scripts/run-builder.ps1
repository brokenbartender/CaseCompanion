param(
  [string]$Goal = "Add a short helper line under the agent input: `Tip: prefix with builder: for code changes.` Use write_source_file to update the existing component."
)

$loginBody = @{ email = 'demo@lexipro.local'; password = 'LexiPro!234' } | ConvertTo-Json
$token = $null
$ws = $null

for ($i = 0; $i -lt 5; $i++) {
  try {
    $login = Invoke-RestMethod -Uri http://localhost:8787/api/auth/login -Method Post -ContentType 'application/json' -Body $loginBody
    $token = $login.token
    $ws = $login.workspaceId
    if ($token -and $ws) { break }
  } catch {
    Start-Sleep -Seconds 5
  }
}

if (-not $token -or -not $ws) { throw "Login failed." }

$builderBody = @{ goal = $Goal } | ConvertTo-Json
$headers = @{ Authorization = "Bearer $token"; 'x-workspace-id' = $ws }
Invoke-RestMethod -Uri http://localhost:8787/api/ai/builder -Method Post -Headers $headers -ContentType 'application/json' -Body $builderBody | ConvertTo-Json -Depth 6
