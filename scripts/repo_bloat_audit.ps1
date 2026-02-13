# Repo Bloat Audit (local)
$ErrorActionPreference = 'Stop'

$tracked = git ls-files
$rows = foreach ($f in $tracked) {
  if (Test-Path $f) {
    $len = (Get-Item $f).Length
    [pscustomobject]@{ SizeMB = [math]::Round($len/1MB,2); Path = $f }
  }
}
$rows | Sort-Object SizeMB -Descending | Select-Object -First 50 | Format-Table -AutoSize

"`nBy top folder:" | Write-Output
$rows | ForEach-Object { $_ | Add-Member -NotePropertyName Top -NotePropertyValue (($_.Path -split '/|\\')[0]) -Force; $_ } | Group-Object Top | ForEach-Object {
  [pscustomobject]@{ Top = $_.Name; SizeMB = [math]::Round((($_.Group | Measure-Object SizeMB -Sum).Sum),2) }
} | Sort-Object SizeMB -Descending | Format-Table -AutoSize
