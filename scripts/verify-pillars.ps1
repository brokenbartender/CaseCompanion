$ErrorActionPreference = "Stop"

Write-Host "[1/5] Build"
npm run build

Write-Host "[2/5] Tests"
npm run test

Write-Host "[3/5] Audit"
npm run audit

Write-Host "[4/5] Gate checks"
$forbidden = "(demoMode|mock_exhibits|initialData|State of Columbia v)"
$secretRegex = '(api_key|secret|password|token)\s*[:=]\s*[''"]?[A-Za-z0-9_-]{16,}[''"]?'

$forbiddenHits = rg -n --glob "!**/node_modules/**" --glob "!**/dist/**" --glob "!**/build/**" --glob "!**/*.lock" --glob "!**/*.zip" --glob "!scripts/verify-pillars.*" $forbidden .
if ($forbiddenHits) { throw "Forbidden demo/mock scaffold string found: $forbiddenHits" }
$secretHits = rg -n --glob "!**/node_modules/**" --glob "!**/dist/**" --glob "!**/build/**" --glob "!**/*.lock" --glob "!**/*.zip" --glob "!scripts/verify-pillars.*" $secretRegex .
if ($secretHits) { throw "Potential secret found: $secretHits" }

Write-Host "[5/5] Proof-of-life (optional)"
Write-Host "If the stack is running, verify /api/proof-of-life manually."

Write-Host "PASS: Pillar verification complete."
