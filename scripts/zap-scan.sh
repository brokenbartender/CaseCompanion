#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.yml"
NETWORK_NAME="enterprise_default"
REPORT_DIR="$ROOT/zap"

mkdir -p "$REPORT_DIR"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker network create "$NETWORK_NAME" >/dev/null 2>&1 || true
docker compose -f "$COMPOSE_FILE" up --build -d

echo "Waiting for services to warm up..."
sleep 20

docker run --rm \
  --network "$NETWORK_NAME" \
  -v "$REPORT_DIR":/zap \
  mbagliojr/zap2docker \
  zap-baseline.py \
    -t http://frontend:3000 \
    -r /zap/zap-report.html \
    -J /zap/zap-report.json \
    -q \
    -I

REPORT_PATH="$REPORT_DIR/zap-report.json"

python - <<PY
import json
from pathlib import Path
import sys

report_path = Path("$REPORT_PATH")
if not report_path.exists():
    sys.exit("ZAP report missing, cannot evaluate vulnerabilities.")

data = json.loads(report_path.read_text())
alerts = []
for site in data.get("site", []):
    for alert in site.get("alerts", []):
        riskdesc = alert.get("riskdesc", "")
        if "High" in riskdesc or "Critical" in riskdesc:
            alerts.append(alert)

if alerts:
    print("High/Critical ZAP alerts detected:")
    for alert in alerts:
        print(f" - {alert.get('alert')} [{alert.get('riskdesc')}]")
    sys.exit(1)
else:
    print("ZAP baseline scan passed (no High/Critical alerts).")
PY
