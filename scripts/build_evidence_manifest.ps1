param(
  [Parameter(Mandatory = $true)]
  [string]$EvidenceRoot,

  [string]$OutputPath = "local/evidence_manifest.json",

  # Optional prefix used for the "path" field in the manifest. Keep this stable so tags/metadata
  # keyed by path remain consistent across imports.
  [string]$PathPrefix = "local-evidence"
)

$ErrorActionPreference = "Stop"

function Infer-Category {
  param([string]$Name, [string]$RelativePath)

  $hay = ($Name + " " + $RelativePath).ToLowerInvariant()

  if ($hay -match "timeline|chronolog|summary") { return "Timelines" }
  if ($hay -match "witness|victim statement|testimony|impact statement") { return "Witnesses" }
  if ($hay -match "medical|er visit|hospital|trinity|bill|injury|diagnosis|ptsd|therapy") { return "Medical" }
  if ($hay -match "court|complaint|summons|motion|notice|filing|foia|police report|ocso|osco|mcl|mcr") { return "Filings & Notices" }
  if ($hay -match "\\.(mov|mp4|mkv|avi|webm|wav|mp3|m4a|aac|flac|jpg|jpeg|png|heic)$") { return "Media" }
  return "Other"
}

if (!(Test-Path -LiteralPath $EvidenceRoot)) {
  throw "EvidenceRoot not found: $EvidenceRoot"
}

$rootItem = Get-Item -LiteralPath $EvidenceRoot
if ($rootItem -isnot [System.IO.DirectoryInfo]) {
  throw "EvidenceRoot must be a directory: $EvidenceRoot"
}

$outDir = Split-Path -Parent $OutputPath
if ($outDir -and !(Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$files = Get-ChildItem -LiteralPath $EvidenceRoot -Recurse -File -Force |
  Where-Object { $_.Name -notin @("desktop.ini", ".DS_Store") }

$items = @()
foreach ($f in $files) {
  $relative = [System.IO.Path]::GetRelativePath($EvidenceRoot, $f.FullName)
  $relative = $relative -replace "\\\\", "/"
  $name = $f.Name
  $ext = ($f.Extension.TrimStart(".") | ForEach-Object { $_.ToLowerInvariant() })
  if (-not $ext) { $ext = "file" }
  $category = Infer-Category -Name $name -RelativePath $relative

  $items += [pscustomobject]@{
    name = $name
    path = "$PathPrefix/$relative"
    ext = $ext
    category = $category
  }
}

$json = $items | ConvertTo-Json -Depth 6
Set-Content -LiteralPath $OutputPath -Value $json -Encoding UTF8

Write-Output ("Wrote {0} item(s) to {1}" -f $items.Count, $OutputPath)

