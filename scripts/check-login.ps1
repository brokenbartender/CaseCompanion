$body = @{ email = 'demo@lexipro.local'; password = 'LexiPro!234' } | ConvertTo-Json
try {
  $resp = Invoke-WebRequest -Uri http://localhost:8787/api/auth/login -Method Post -ContentType 'application/json' -Body $body -UseBasicParsing
  Write-Output $resp.StatusCode
  Write-Output $resp.Content
} catch {
  Write-Output $_.Exception.Message
  if ($_.Exception.Response) {
    $r = $_.Exception.Response
    $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
    Write-Output $sr.ReadToEnd()
  }
}
