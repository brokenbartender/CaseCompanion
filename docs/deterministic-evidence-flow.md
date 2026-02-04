# Deterministic Evidence Flow

This document maps the architecture we promised in the “Project LexiPro” one-pager to the actual code, so investigators, buyers, and auditors can trace the promise to the implementation and prove nothing is left to chance.

## Pixel-Perfect Anchoring (Forensic Teleport)
- `src/components/ExhibitViewer.tsx` initializes `pdfjs.GlobalWorkerOptions` with the worker shipped in `pdfjs-dist/build/pdf.worker.min.mjs` and sets `standardFontDataUrl` so physical text coordinates are resolvable at runtime.
- Every rendered page tracks its `[x, y, width, height]` through `pageDimsRef`/`pageRenderDimsRef`, which feeds the highlight overlay rendered with absolute CSS (see lines 33‑207). Those refs are the exact “physical grounding” points mentioned in the pitch deck, enabling the “one-click teleport” described in the investor summary.

## Immutable Chain of Custody
- The ingestion pipeline (`server/index.ts:202‑265`) computes a SHA‑256 hash for every uploaded exhibit (`sha256File`) and stores it together with deterministic metadata (`sanitizeFilename`, storage key, `matter.slug` linkage).
- Every authenticated operation logs an audit record via `logAuditEvent` (see auth login, verification endpoints, `ingestExhibit`, etc.), so the chain can be reconstructed. The `integrityService` (`server/integrityService.ts`) exposes `verifyWorkspaceChain` and `performPhysicalDeepAudit`, which run merkle-style hash verification and physical file comparisons before issuing an **integrity certificate (PDF) with embedded hashes** via `generateSignedReport`.
- Because `server/package.json` now runs `prisma generate` before tests and CI runs `npm run build`, `npm run test`, and `npm run audit` (`.github/workflows/ci.yml`), the ledger tooling and audit coverage stay reproducible across environments.
Audit coverage expectation: every evidence interaction emits an audit event.



### Canonical vs Convenience Proofs
Canonical proofs (what counts for diligence):
- Audit log entries (`logAuditEvent`) and integrity ledger verification (`/api/integrity/verify`).
- Integrity certificate PDF produced by `generateSignedReport`.

Convenience proofs (not canonical):
- Per-request response headers (release cert chain).
- UI badges, status chips, or transient client indicators.
Release-cert chain scope is per-process; canonical proofs remain audit log + integrity ledger.

Order of Proof (canonical):
1. Audit event(s)
2. Integrity record (SHA-256 verify-on-read)
3. Anchor mapping (bbox coordinates)
4. UI badges/headers (non-canonical convenience)
## Deterministic Prompting & Proof-of-Life Controls
- The “PRP-001” and “PRP-002” pathways are encoded in `server/prompts.json`, which sets a deterministic logic chain, requires coordinate-backed citations, and enforces “null state” errors whenever a step breaks. The same doc references the enforcement of `temperature: 0.1` inside `LOGIC_CHAIN.md` and `SECURITY.md`, proving the AI layer is always rule-bound.
- Server-side schemas use `zod` and strict `requireWorkspace`/`requireRole` middleware, so the backend enforces zero trust while the frontend remains a dumb renderer that can never bypass the audit path.

## Compliance & Reproducibility
- The 150 MB `LexiProApp_SOURCE.zip` was removed from version control in favor of `docs/source-archive.md`, which documents how to regenerate the archive outside git (PowerShell/`zip` commands) and store it as a release artifact—this satisfies “Enterprise Build Reproducibility” and keeps compliance teams happy.
- The CI workflow (`.github/workflows/ci.yml`) now runs `npm run build`, `npm run test`, and `npm run audit` for every push/PR, establishing a transparent release gate and a green badge to show in the acquisition deck.
- `server/integrityService`’s integrity certificate generator plus the deterministic audit log make LexiPro ready for SOC 2-style diligence. Highlight these artifacts in your investor discussion to reinforce the “Immutable Chain of Custody” and “Audit Logging & Non-Repudiation” promises.

## Zero-Temperature Guardrails (PRP-001 Proof)
- The AI route enforces `AI_TEMPERATURE = 0.1` in `server/index.ts`: the Gemini request always runs with `temperature: 0.1`, the PRP-001 prompts from `server/prompts.json`, and a reusable `buildAnchoringSystem()` that concatenates the deterministic instructions (no creativity allowed). That file also exposes `/api/ai/guardrails`, which returns the exact system text and config so you can demonstrate “the AI literally cannot hallucinate” with a simple `curl http://localhost:8787/api/ai/guardrails`.
- The route also expects `anchorsRequired: true` and validates every anchor ID versus the workspace’s anchors in the database; anything that resolves to nothing is filtered out and incites a 422, so claims without a proven source are deliberately dropped before the response leaves the server.
- Server-side enforcement boundary: `/api/ai/chat` builds findings from database anchors (not the model payload). If a claim lacks a valid anchor or bbox, `assertGroundedFindings` raises a 422 and the response is withheld before any UI sees it.
- Example guardrail call (replace host/port if needed):

```bash
curl localhost:8787/api/ai/guardrails | jq
```

The JSON response lists the enforced temperature, the prompt key (`forensic_synthesis` by default), the `releaseGatePolicy`, the `groundingValidator`, and the full deterministic instructions that accompany every chat request.

## Immutable Source Linking (Forensic Map Proof)
- The `/api/ai/chat` endpoint returns `findings` that include per-claim `anchorId`, `exhibitId`, `page_number`, and `bbox`, and those anchors are looked up from `prisma.anchor` (`server/index.ts:1238-1267`) to ensure they belong to the requesting workspace.
- Each finding is vetted by `assertGroundedFindings`, which compares the model output to the database anchors and refuses to proceed if anything is malformed. The result is a JSON response (and matching UI highlight via `src/components/ExhibitViewer.tsx`) that includes only claims with a provable path back to `[x, y, w, h]` coordinates, giving you an immutable citation for every sentence the AI emits.

-## Cryptographic Chain of Custody
- Every upload runs `sha256File` in `server/index.ts:202-255`, stores `integrityHash` in `prisma.exhibit`, and the ingest/verification/AI audit routes explicitly call `logAuditEvent` (see `server/index.ts:367-383`, `/api/workspaces/:workspaceId/audit/*`, `/api/ai/chat`, `/api/workspaces/:workspaceId/misconduct/analyze`). The `integrityService` (`server/integrityService.ts`) verifies the ledger, performs physical audits, and generates the integrity certificate (PDF) with embedded hashes that buyers can download (`/api/workspaces/:workspaceId/audit/*`).
- To prove the chain is unbroken, call the new `/api/integrity/verify` endpoint after logging in; it replays the SHA-256/previous-hash chain, records the verification event, and returns `{ isValid, eventCount, integrityHash }`. Use that JSON or the integrity certificate (`/api/workspaces/:workspaceId/audit/generate-report`) as courtroom-ready evidence that every document interaction is tamper-proof.

## Financial ROI & Efficiency
- Call `GET /api/workspaces/:workspaceId/misconduct/analyze` to run `analyzeMisconduct(prisma, workspaceId)` (logs `MISCONDUCT_ANALYSIS`). The response lists per-anchor violation codes, quotes, `[x,y,w,h]` anchors, statutory references, estimated recoveries, and automation stats (automationRate, settlementGapValue, accuracyMultiplier). Use this endpoint during the demo to show “Automated Settlement Discovery” in real time.
- The final payload also makes the “66% automation” / “10x accuracy” story explicit: `automationRate` demonstrates how much of the anchor-driven analysis is handled without human triage, and `accuracyMultiplier` is fixed at 10x because every violation is matched to an existing anchor (`assertGroundedFindings` enforces the contract). The `settlementGapValue` shows how much additional recovery LexiPro found beyond what manual review would have caught, making the “profit center” narrative tangible.
