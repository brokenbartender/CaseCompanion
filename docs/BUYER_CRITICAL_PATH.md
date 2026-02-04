# Buyer Critical Paths

## Frontend routes (top-level)
- /login
- /
- /intelligence
- /admissibility
- /exhibits -> /
- /assistant -> /intelligence
- /verification -> /admissibility
- /integrity -> /admissibility
- /integrity-audit -> /admissibility
- /compliance -> /admissibility
- /vault -> /
- /chronology -> /intelligence
- /timeline -> /intelligence
- /roadmap -> /

## Key API endpoints (selected)
- Auth
  - POST /api/auth/register
  - POST /api/auth/login
  - GET /api/auth/me
  - POST /api/auth/logout
  - GET /api/auth/oidc/login
  - GET /api/auth/oidc/callback
  - GET /api/auth/oidc/status
- Exhibits / evidence
  - GET /api/workspaces/:workspaceId/exhibits
  - POST /api/workspaces/:workspaceId/exhibits
  - POST /api/workspaces/:workspaceId/matters/:matterId/exhibits
  - GET /api/workspaces/:workspaceId/exhibits/:exhibitId/auto-index
  - GET /api/workspaces/:workspaceId/exhibits/search
  - DELETE /api/workspaces/:workspaceId/exhibits/:exhibitId
  - GET /api/workspaces/:workspaceId/exhibits/:exhibitId/file
- Integrity / audit / governance
  - GET /api/integrity/verify
  - GET /api/integrity/status
  - GET /api/proof-of-life
  - GET /api/workspaces/:workspaceId/audit/recent
  - GET /api/workspaces/:workspaceId/audit/logs
  - POST /api/audit/log
  - GET /api/workspaces/:workspaceId/audit/verify
  - POST /api/workspaces/:workspaceId/audit/generate-report
  - GET /api/workspaces/:workspaceId/governance/snapshot
  - GET /api/workspaces/:workspaceId/metrics/guardrails
- Preferences / Bates
  - GET /api/workspaces/:workspaceId/prefs
  - POST /api/workspaces/:workspaceId/prefs
  - POST /api/workspaces/:workspaceId/production/bates
- AI / analysis
  - GET /api/ai/status
  - GET /api/ai/guardrails
  - POST /api/ai/safe-chat
  - POST /api/ai/aigis
  - POST /api/aigis/chat
  - GET /api/aigis/chat/stream
  - POST /api/ai/timeline
  - POST /api/ai/outcome
  - POST /api/ai/damages
  - POST /api/workspaces/:workspaceId/chronology/run
  - GET /api/workspaces/:workspaceId/chronology/latest
- Demo / test / health
  - POST /api/demo/seed
  - POST /api/demo/sabotage
  - GET /api/health

---

## 10 Buyer Critical Paths (end-to-end)

### 1) First-time sign-in and workspace bootstrap
**Preconditions**
- No active session

**Steps**
1. Go to `/login`.
2. Use ?Create workspace account? (first-time) or ?Sign in? (returning).
3. Confirm landing on `/` with the proof bar and header Workspace Context visible.
4. Confirm workspace is set via `/api/auth/me` (no localStorage; session is cookie + sessionStorage only).

**Expected proof artifacts**
- Audit event: `AUTH_LOGIN` for the workspace
- Integrity badge shows status (verified/unverified) without errors
- Workspace Context shows name + short workspaceId in the header

**Failure cases**
- Self-signup disabled: ?Self-signup is disabled. Contact your admin.?
- OIDC not configured: ?Enterprise SSO is not configured.?
- Auth misconfig: user sees a clean auth failure message and stays on `/login`.

---

### 2) Evidence ingest (demo seed)
**Preconditions**
- Authenticated user with workspace
- `DEMO_SEED_ENABLED=true` and approval token configured

**Steps**
1. From `/`, click Start Ingest in Enterprise Ingest Simulation.
2. Wait for ingest log to show hashing + anchor extraction.

**Expected proof artifacts**
- Audit event(s): ingest/ledger events
- Integrity pulse updates (live events)

**Failure cases**
- Missing approval token: UI shows Approval token required.
- Seed disabled: UI shows Demo seed disabled.

---

### 3) Evidence ingest (real file upload)
**Preconditions**
- Authenticated user with workspace

**Steps**
1. Drag/drop PDF into the Tactical Ingest drop zone.
2. Wait for ingest progress to complete.

**Expected proof artifacts**
- Exhibit created and listed in workspace
- Integrity badge remains stable; ledger events appear

**Failure cases**
- Upload too large: UI shows upload failure
- Workspace missing: UI shows workspace required

---

### 4) Evidence viewer + integrity overlay
**Preconditions**
- At least one exhibit in workspace

**Steps**
1. Navigate to Evidence Locker (`/exhibits`).
2. Select an exhibit thumbnail.
3. Viewer renders PDF and integrity status.

**Expected proof artifacts**
- Exhibit integrity status shown (certified/pending/revoked)
- Integrity verify endpoint reachable

**Failure cases**
- Exhibit file missing: viewer shows error state
- Integrity revoked: UI highlights revocation reason

**Manual verification checklist**
- Loading state appears while the file is fetched/rendered.
- Empty state appears when no exhibit is selected.
- Error state appears for missing/blocked file.
- Integrity badge shows Certified/Pending/Revoked; revoked includes reason + timestamp.
- Viewer shows either PDF or a clear placeholder (no blank screen).

---

### 5) Citation teleport (deterministic jump)
**Preconditions**
- Anchors exist for exhibit
- AI output includes anchor IDs

**Steps**
1. Go to `/intelligence` (Case Assistant).
2. Generate anchored output.
3. Click Jump to Source.

**Expected proof artifacts**
- Viewer scrolls and highlights within 1s
- No desync on repeated clicks

**Failure cases**
- Missing bbox: shows notice or no highlight
- Exhibit mismatch: system switches exhibit and replays jump

**Manual verification checklist**
- Use a seeded anchor/citation (from demo seed or anchored analysis) and click Jump to Source.
- If bbox missing, viewer navigates to the page and shows “BBox unavailable - navigated to page N.”
- If exhibit mismatch, viewer auto-switches and shows “Switched to Exhibit …”.
- Timing check: highlight/scroll begins within ~1s of click.

**Manual test script (4 cases)**
1) Normal bbox: anchored claim with bbox -> highlight renders on correct page.
2) AnchorId only: remove bbox in client response -> fetch anchor -> highlight renders.
3) Missing bbox: remove bbox + anchor coords -> scroll to page + toast.
4) Exhibit mismatch: click citation from another exhibit -> auto-switch + highlight.

**Automated check (Playwright)**
- Start app + API (dev servers)
- Run `npm run test:e2e`

---

### 6) Admissibility ledger review
**Preconditions**
- Ledger events exist for workspace

**Steps**
1. Go to `/admissibility`.
2. Review audit rows and evidence chain status.

**Expected proof artifacts**
- Audit rows with status (verified/pending/tampered)
- Integrity hash preview shown

**Failure cases**
- No ledger events: UI shows empty state and CTA to ingest

---

### 7) Admissibility packet export
**Preconditions**
- At least one verified exhibit

**Steps**
1. In `/` or `/admissibility`, click Export admissibility packet.
2. Confirm ZIP download.
3. Run export metadata capture script to log manifest.

**Expected proof artifacts**
- Export includes manifest and hashes
- Audit event logged for export
 - Export metadata captured in `reports/demo-evidence/`

**Failure cases**
- No exhibits: UI warns No verified exhibits available.
 - Export failed: UI shows clear failure message with retry
- Export service error: UI shows failure reason

---

### 8) Governance snapshot (guardrails)
**Preconditions**
- Authenticated user with workspace

**Steps**
1. Open `/admissibility`.
2. Review governance snapshot section.

**Expected proof artifacts**
- Guardrails metrics (anchored vs ungrounded)
- Proof-of-life and verify endpoints respond

**Failure cases**
- Missing data: UI displays Awaiting evidence.

---

### 9) Workspace preferences persistence (tour)
**Preconditions**
- Authenticated user with workspace

**Steps**
1. Start Guided Tour.
2. Complete tour and reload.

**Expected proof artifacts**
- Pref stored under workspace key `lexipro_tour_completed`
- Tour does not re-run unless reset

**Failure cases**
- Prefs endpoint unavailable: tour may re-run; UI remains functional

---

### 10) Bates reservation (atomic counter)
**Preconditions**
- Authenticated user with workspace

**Steps**
1. Trigger Bates auto index.
2. Observe assigned Bates range.

**Expected proof artifacts**
- Atomic range returned (start/end/next)
- Counter increments without collisions

**Failure cases**
- Prefs table missing: fallback to local reservation, UI indicates standby

---
