#!/usr/bin/env bash
set -euo pipefail

(cd server && npx prisma db push --accept-data-loss)
(cd server && npx tsx demo/scripts/seed_golden_demo.ts)
