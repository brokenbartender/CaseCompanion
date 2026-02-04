# Compliance Checklist

Step through this checklist when validating LexiPro before a demo or diligence review.

1. **Deterministic Guardrails**
   - Call `GET /api/ai/guardrails` (requires auth). Confirm `temperature: 0.1`, PRP-001 instructions, `anchorsRequired: true`, `releaseGatePolicy: NO_ANCHOR_NO_OUTPUT_422`, and `groundingValidator: assertGroundedFindings`.
   - Verify `/api/prompts` (if instrumented) uses the same deterministic payload and that `ai/chat` only outputs JSON claims.
   - Attempt a prompt that returns unanchored claims and confirm the API returns 422 with `NO_ANCHOR_NO_OUTPUT` (release gate is server-enforced).

2. **Immutable Ledger**
   - Run `GET /api/integrity/verify`; confirm `isValid === true`, `eventCount > 0`, and `integrityHash` matches the latest audit event.
   - Inspect `/api/workspaces/:workspaceId/audit/logs` sorted by timestamp to see `logAuditEvent` entries for ingest, verification, AI, and misconduct analysis.
   - Readiness: `GET /api/health/env` (auth) returns missing env keys only (no values).

3. **ROI & Settlement Discovery**
   - Call `GET /api/workspaces/:workspaceId/misconduct/analyze`. Review `automationRate`, `settlementGapValue`, and per-anchor violations (`anchorId`, `bbox`, `quote`, `estimatedRecovery`).
   - Link at least one violation to the viewer highlight (via `anchorId` -> `ExhibitViewer`) to prove the source anchor.

4. **Exportable Proof**
   - Trigger `POST /api/workspaces/:workspaceId/audit/generate-report`; verify it uploads the integrity certificate (PDF) to storage and returns the download path.
   - Certificate export: `GET /api/workspaces/:workspaceId/exhibits/:exhibitId/certificate` returns an evidence certificate (JSON v1) grounded to anchors + integrity + audit.
   - Optional: download and open the PDF to confirm the embedded hash and summary text match the audit result.

5. **Automated Build/Test/Audit**
   - Ensure the GitHub Actions `CI` workflow is green for the latest commit. It runs `npm run build`, `npm run test`, `npm run audit`.
   - Evidence link (latest green run): https://github.com/brokenbartender/Enterprise/actions/runs/21124591064
   - Mention that local `npm run audit` passes with zero vulnerabilities and that Prisma client generation is automated via the `pretest` hook.

Keep this checklist near your briefing notes so auditors can watch these steps live and tick each box.
