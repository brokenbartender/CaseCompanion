# LexiPro Forensic OS — CHANGELOG

## [1.1.2] - 2026-01-17
### Security
- Phase 3: Added workspace-scoped exhibit file/anchor routes (`/api/workspaces/:workspaceId/exhibits/:exhibitId/(file|anchors)`).
- Marked legacy exhibit routes as deprecated via `X-Deprecated: true` while retaining full access checks.
- Added `SECURITY_ROUTE_MATRIX.md` and expanded IDOR unit tests.

## [1.2.0] - 2026-01-24

### Grounding / Hallucination Proof-of-Life
- Added a single canonical **Forensic Finding Contract** (Zod) requiring: `exhibitId`, `anchorId`, `page_number`, `bbox:[x1,y1,x2,y2]` (plus optional `quote`, `confidence`).
- Implemented **backend enforcement** via `assertGroundedFindings()`:
  - Validates schema strictly.
  - Verifies each `anchorId` exists in DB for the **same exhibit + workspace**.
  - Validates `page_number` and `bbox` against the stored anchor (with tolerance).
  - Rejects any failure with **422 Unprocessable Entity**.
- Updated `/api/ai/chat` to return **grounded findings** derived from DB anchors and to fail closed if grounding is impossible.
- Added explicit **grounding gate endpoint**: `POST /api/workspaces/:workspaceId/exhibits/:exhibitId/forensic/findings/validate`.
- Reclassified timeline/outcome/damages AI endpoints to return **NarrativeDraft** objects (`admissible:false`) to prevent any ungrounded output from being treated as forensic evidence.
- Frontend now displays only grounded findings as admissible; otherwise shows **"Ungrounded draft — not admissible"**.
- Added regression tests for grounding enforcement (schema + anchor ownership + page/bbox mismatch).

## [1.3.0] - Post-Acquisition Polish
- Refactored server monolith into domain-specific routers (AI, Exhibits, Teleport).
- Extracted utility helpers and middleware for better maintainability.
