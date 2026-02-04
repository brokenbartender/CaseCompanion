# CODE HANDOVER MANIFEST

Day-1 operator manual for LexiPro. All references below are grep-verifiable in this repo.

## Map (Core Pillars)
- Grounding / withholding governance: `server/forensics/assertGroundedFindings.ts`
- Audit ledger + chaining: `server/services/auditService.ts` and `server/prisma/schema.prisma` (model: `AuditLedgerProof`)
- Vector store / embeddings: `server/services/VectorStorageService.ts`
- Proof packet generator: `server/scripts/proof-packet.ts` and `server/scripts/proof-packet-check.ts`
- HTTP API entrypoint: `server/index.ts`

## Run Commands
- Install deps: `npm install`
- Dev (client + server): `npm run dev`
- Server only: `npm --prefix server run dev`
- Tests: `npm --prefix server test`
- Proof packet: `npm --prefix server run proof:packet`
- Proof packet self-check: `npm --prefix server run proof:packet:check -- <packet-dir>`

## Runtime Notes
- Server port: `process.env.PORT || 8787` in `server/index.ts`

## Known Sharp Edges
- Proof packet requires a PostgreSQL `DATABASE_URL` and will fail otherwise (`server/scripts/proof-packet.ts`).

## Security Notes (Factual Only)
- Disk storage encryption requirements are enforced in `server/storageService.ts`.
- `GENESIS_SEED` is required for audit signing in `server/services/auditService.ts`.
- `PRIVATE_KEY_PEM` is required for audit signatures in `server/audit.ts`.
