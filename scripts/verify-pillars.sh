#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Build"
npm run build

echo "[2/5] Tests"
npm run test

echo "[3/5] Audit"
npm run audit

echo "[4/5] Gate checks"
FORBIDDEN_REGEX='(demoMode|mock_exhibits|initialData|State of Columbia v)'
SECRET_REGEX='(api_key|secret|password|token)\s*[:=]\s*["'"'"']?[A-Za-z0-9_-]{16,}["'"'"']?'

if rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/*.lock' --glob '!**/*.zip' --glob '!scripts/verify-pillars.*' -e "$FORBIDDEN_REGEX" .; then
  echo "ERROR: Forbidden demo/mock scaffold string found."
  exit 1
fi
if rg -n --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/build/**' --glob '!**/*.lock' --glob '!**/*.zip' --glob '!scripts/verify-pillars.*' -e "$SECRET_REGEX" .; then
  echo "ERROR: Potential secret pattern found."
  exit 1
fi

echo "[5/5] Proof-of-life (optional)"
echo "If the stack is running, verify /api/proof-of-life manually."

echo "PASS: Pillar verification complete."
