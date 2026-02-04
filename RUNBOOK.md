# RUNBOOK

## Quick start (deterministic demo)
1) Install deps
- `npm ci`
- `npm ci --prefix server`

2) Start backend (keep running)
- `Set-Location -LiteralPath "<REPO_ROOT>\server"`
- `npm run start`

3) Start frontend (separate terminal)
- `Set-Location -LiteralPath "<REPO_ROOT>"`
- `npm run demo:up`

4) Run tests
- `npm --prefix server run build`
- `npm run build`
- `npm --prefix server test`
- `npx playwright test`

## Ports
- Backend: 8787 (http://127.0.0.1:8787)
- Frontend (dev): 5173 (http://127.0.0.1:5173)
- Frontend (if configured for prod): 3001
- Postgres (demo): 5433

## Demo credentials
- Email: demo@lexipro.local
- Password: LexiPro!234

## Pre-Flight (Golden Run)
Run these before any demo session:
- `npx tsx server/scripts/verify-demo-readiness.ts`
- `npm run verify:packet -- <proof-packet.zip>`

If the proof packet checksum changes, refresh the golden master:
- `npm run verify:packet -- <proof-packet.zip> --record`

## Common failures
- **ECONNREFUSED 127.0.0.1:8787**: backend not running. Start with `npm run start` in `server`.
- **Prisma EPERM unlink query_engine-windows.dll.node**: stop any running backend, then rerun `npm ci --prefix server`.
- **Playwright flake on login**: confirm backend is running and demo seed completed via `npm run demo:up`.
- **Port 8787 in use**: stop the process bound to 8787, then retry `npm run start`.

## Repro green sequence (CI parity)
- `npm ci`
- `npm ci --prefix server`
- `npm --prefix server run build`
- `npm run build`
- `npm --prefix server test`
- `npx playwright test`


