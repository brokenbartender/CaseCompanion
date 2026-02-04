param(
  [Parameter(Mandatory=$true)][string]$PatchPath,
  [string]$Message = "Codex: update"
)

# Try applying patch with common strip levels (Codex patches often include extra folder prefixes)
$applied = $false
foreach ($p in 0,1,2) {
  git apply --3way -p$p $PatchPath
  if ($LASTEXITCODE -eq 0) { $applied = $true; break }
}
if (-not $applied) { throw "git apply failed (even with -p0/-p1/-p2)" }

git add -A

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No changes staged. Nothing to commit."
  exit 0
}

git commit -m $Message
git push
