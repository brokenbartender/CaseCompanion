param(
  [string]$OutputDir = "release_artifacts/v1.3.0_Deal_Room"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = Join-Path $root $OutputDir

if (Test-Path $target) {
  Remove-Item -Recurse -Force $target
}
New-Item -ItemType Directory -Force -Path $target | Out-Null

function Copy-IfExists($srcRel, $destName) {
  $src = Join-Path $root $srcRel
  if (Test-Path $src) {
    Copy-Item -Force $src (Join-Path $target $destName)
  } else {
    Write-Warning "Missing: $srcRel"
  }
}

Copy-IfExists "legal/PATENT_DRAFT_HALLUCINATION_KILLER.md" "PATENT_DRAFT_HALLUCINATION_KILLER.md"
Copy-IfExists "docs/deepening/SEMANTIC_ADVERSARY_WHITE_PAPER.md" "SEMANTIC_ADVERSARY_WHITE_PAPER.md"
Copy-IfExists "docs/deepening/CRYPTO_SHREDDING_PROTOCOL.md" "CRYPTO_SHREDDING_PROTOCOL.md"
Copy-IfExists "docs/api/openapi_v1.3.0.yaml" "openapi_v1.3.0.yaml"
Copy-IfExists "LexiPro_Technical_Architecture.pdf" "LexiPro_Technical_Architecture.pdf"

$zipPath = Join-Path $root "release_artifacts/v1.3.0_Deal_Room.zip"
if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}
Compress-Archive -Path $target -DestinationPath $zipPath
Write-Host "Packaged deal room at $zipPath"
