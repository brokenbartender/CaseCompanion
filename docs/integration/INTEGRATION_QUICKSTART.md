# LexiPro Integration Quickstart (2-Hour Path)

Goal: drop LexiPro's enforcement substrate into an existing RAG stack with minimal risk.

## 0) Requirements
- Node 20.x
- Postgres 14+
- Access to this repo

## 1) Boot the backend
```powershell
cd server
cp .env.example .env
npm install
npm run db:push
npm run dev
```

## 2) Seed a demo workspace (optional but fast)
```powershell
cd ..
node scripts/demo-reset.mjs
```

## 3) Integrate via API (smallest surface)
You only need one call to get grounded answers with proofs:

```http
POST /api/ai/chat
Headers:
  Authorization: Bearer <jwt>
  x-workspace-id: <workspaceId>
Body:
{
  "userPrompt": "Summarize the obligations in the LOI",
  "promptKey": "forensic_synthesis",
  "matterId": "<matterId>"
}
```

Success (200) returns:
- `proof.requestId`
- `proof.claims[]` (claim-level proofs with anchor IDs)
- `proof.contract` + `proof.contractHash` (proof contract + replay binding)
- `anchorsById` (source spans)

Failure (422) returns:
- `errorCode`, `reasons`
- `auditEventId`

This is the enforcement gate. You ship nothing on 422.

## 4) Prove integrity after the fact
- Latest lineage: `GET /api/workspaces/:workspaceId/trust/lineage/latest`
- Trust attestation: `GET /api/workspaces/:workspaceId/trust/attestation/latest`
- Proof packet: `GET /api/workspaces/:workspaceId/matters/:matterId/proof-packet`

## 5) Minimal integration pattern
1. Send prompt to LexiPro instead of your LLM.
2. If 200, forward `report/findings` + `proof`.
3. If 422, return "withheld" to the user.

## 6) Production notes
- Keep `JWT_SECRET` fixed and managed by your IdP.
- Set `STORAGE_ENCRYPTION_REQUIRED=true` in production.
- Rotate keys via your standard KMS schedule.

## 7) Time-to-first-output
Typical integration for an existing RAG stack:
- 30 minutes: environment + auth
- 30 minutes: first call + enforcement gate
- 60 minutes: proof packet + audit verification
