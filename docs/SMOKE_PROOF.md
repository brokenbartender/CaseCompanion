# Smoke Proof

- Date/time: 2026-01-19 05:16:49 -05:00
- Services (manual demo start):
  - Backend: `npm --prefix server run dev`
  - Frontend: `npm run dev`
- Automated smoke (one-shot script):
  - POST `/api/auth/register` -> 200
  - GET `/api/auth/me` -> 200
  - GET `/api/integrity/verify` -> 200
- Example JSON field names (no secrets):
  - `/api/auth/me`: `ok`, `userId`, `workspaceId`
  - `/api/integrity/verify`: `isValid`, `eventCount`, `integrityHash`, `details`
