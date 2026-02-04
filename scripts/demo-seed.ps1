param(
  [string]$Email = "demo@lexipro.local",
  [string]$Password = "demo1234",
  [string]$PdfPath = "docs\\LexiPro_Demo_Exhibit.pdf",
  [string[]]$PdfPaths = @(
    "docs\\demo_set\\Anchor_Agreement.pdf",
    "docs\\demo_set\\Email_Thread.pdf",
    "docs\\demo_set\\Financial_Statement.pdf",
    "docs\\demo_set\\Contradictory_Memo.pdf"
  )
)

$null = Add-Type -AssemblyName System.Net.Http

$base = "http://localhost:8787/api"
$body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress

try {
  Invoke-RestMethod -Uri "$base/auth/register" -Method POST -ContentType "application/json" -Body $body | Out-Null
} catch {
  # user may already exist
}

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -ContentType "application/json" -Body $body
$token = $login.token
$workspaceId = $login.workspaceId
if (-not $token -or -not $workspaceId) {
  throw "Login failed; cannot seed demo exhibit."
}

if ($PdfPaths -and $PdfPaths.Count -gt 0) {
  $uploadPaths = $PdfPaths
} else {
  $uploadPaths = @($PdfPath)
}

$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)
$client.DefaultRequestHeaders.Add("x-workspace-id", $workspaceId)

$seeded = 0
foreach ($path in $uploadPaths) {
  if (-not (Test-Path $path)) {
    throw "PDF not found: $path"
  }

  $form = New-Object System.Net.Http.MultipartFormDataContent
  $fileStream = [System.IO.File]::OpenRead($path)
  $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/pdf")
  $form.Add($fileContent, "file", [System.IO.Path]::GetFileName($path))
  $form.Add((New-Object System.Net.Http.StringContent("Demo Exhibit")), "title")

  $resp = $client.PostAsync("$base/workspaces/$workspaceId/exhibits", $form).Result
  $fileStream.Dispose()

  if (-not $resp.IsSuccessStatusCode) {
    $err = $resp.Content.ReadAsStringAsync().Result
    $client.Dispose()
    throw "Upload failed: $($resp.StatusCode) $err"
  }

  $seeded++
}

$client.Dispose()

Write-Host "Seeded $seeded demo exhibit(s) for workspace $workspaceId"
