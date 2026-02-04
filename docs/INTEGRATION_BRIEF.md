# Integration Brief (Forensic Substrate)

## Purpose
LexiPro exposes a minimal, swappable integration boundary so acquirers can adopt the forensic substrate without the full UI.

## Server Substrate API (Module)
Location: `server/services/forensicSubstrate.ts`

Primary functions:
- `ingestEvidence({ workspaceId, userId, file, matterIdOrSlug })`
- `resolveAnchors({ workspaceId, exhibitId })`
- `releaseGateCheck({ totalClaims, rejectedClaims })`
- `emitAuditEvent({ workspaceId, actorId, eventType, payload })`
- `exportProofPacket({ workspaceId, matterId })`
- `verifyAuditChain({ workspaceId })`
- `getLedgerProof({ workspaceId })`

## Client Teleport Component
Location: `src/components/CitationTeleport.tsx`

Inputs:
- `docId` (exhibit id)
- `pageId` (page number)
- `startChar` / `endChar` (nullable)
- `anchorId` (optional)

## Minimal Integration Flow
1. Upload evidence via `ingestEvidence`.
2. Use `resolveAnchors` to retrieve anchor metadata.
3. Enforce `releaseGateCheck` before returning AI output.
4. Record terminal events via `emitAuditEvent`.
5. Export an immutable proof packet using `exportProofPacket`.
6. Verify chain integrity via `verifyAuditChain` and include the latest ledger proof when needed.

## Deterministic Citation Locator
The backend returns a `locator` object with each anchor.
Use it to drive a teleport/highlight UX independent of UI shell.
