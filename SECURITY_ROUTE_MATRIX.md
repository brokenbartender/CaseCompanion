# SECURITY_ROUTE_MATRIX

Purpose: prove a zero-trust, multi-tenant route contract (IDOR-safe) for LexiPro Forensic OS.

## Invariants

1. **Workspace-scoped routes** (`/api/workspaces/:workspaceId/...`) enforce membership for `req.userId`.
2. **Resource-id routes** (e.g. `:exhibitId`) resolve the resource to its true `workspaceId` and enforce membership.
3. If **both** `:workspaceId` and `:exhibitId` are present, `:workspaceId` **must equal** `exhibit.workspaceId` or the request is denied (**403**).
4. Legacy endpoints are allowed only if they go through the same access checks and are explicitly marked deprecated.

## Route Matrix (tenant-sensitive)

| Route | Method | Tenant Scope Pattern | Required Middleware | Access Check (DB) | Notes |
|---|---:|---|---|---|---|
| `/api/workspaces/:workspaceId/exhibits` | GET | workspace-scoped | `authenticate`, `requireWorkspace` | `workspaceMember(workspaceId,userId)` | list exhibits |
| `/api/workspaces/:workspaceId/exhibits` | POST | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(member)` | membership + ingest writes `workspaceId` | upload/ingest |
| `/api/workspaces/:workspaceId/matters/:matterId/exhibits` | POST | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(member)` | membership + ingest writes `workspaceId` | legacy compatibility |
| `/api/workspaces/:workspaceId/exhibits/:exhibitId/verification` | PATCH | workspace+resource | `authenticate`, `requireWorkspace`, `requireMfa`, `requireRole(member)` | `exhibit.findFirst({id,workspaceId})` | certification requires rehash |
| `/api/workspaces/:workspaceId/exhibits/:exhibitId/anchors` | GET | workspace+resource | `authenticate`, `requireWorkspace`, `validateWorkspaceAccess` | `exhibitId -> exhibit.workspaceId` + membership + scope-match | preferred anchors route |
| `/api/workspaces/:workspaceId/exhibits/:exhibitId/file` | GET | workspace+resource | `authenticate`, `requireWorkspace`, `validateWorkspaceAccess` | `exhibitId -> exhibit.workspaceId` + membership + rehash + scope-match | preferred file read route |
| `/api/workspaces/:workspaceId/audit/logs` | GET | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(admin)` | membership | audit read |
| `/api/workspaces/:workspaceId/audit/verify` | GET | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(admin)` | membership | ledger verify |
| `/api/workspaces/:workspaceId/audit/deep-test` | GET | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(admin)` | membership | physical deep audit |
| `/api/workspaces/:workspaceId/audit/generate-report` | POST | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(admin)` | membership | integrity certificate (PDF) export |
| `/api/workspaces/:workspaceId/exhibits/:exhibitId/forensic/findings/validate` | POST | workspace+resource | `authenticate`, `requireWorkspace`, `validateWorkspaceAccess`, `requireRole(member)` | membership + scope-match | PRP-001 grounding gate |
| `/api/workspaces/:workspaceId/chronology/run` | POST | workspace-scoped | `authenticate`, `requireWorkspace`, `requireRole(member)` | membership | writes belong to workspace |
| `/api/workspaces/:workspaceId/chronology/latest` | GET | workspace-scoped | `authenticate`, `requireWorkspace` | membership | reads belong to workspace |
| `/api/ai/chat` | POST | workspace derived (header or first membership) | `authenticate`, `requireWorkspace`, `requireRole(member)` | membership via `requireWorkspace` | AI calls are workspace-bound |

### Internal-only (non-tenant callable)

| Route | Method | Protection | Notes |
|---|---:|---|---|
| `/internal/integrity/audit` | POST | `requireInternal` (shared secret, internal network) | invoked by cron/worker |

### Legacy (Deprecated)

| Route | Method | Tenant Scope Pattern | Required Middleware | Access Check (DB) | Notes |
|---|---:|---|---|---|---|
| `/api/exhibits/:exhibitId/anchors` | GET | resource-id | `authenticate`, `validateWorkspaceAccess` | `exhibitId -> workspaceId` + membership | returns `X-Deprecated: true` |
| `/api/exhibits/:exhibitId/file` | GET | resource-id | `authenticate`, `validateWorkspaceAccess` | `exhibitId -> workspaceId` + membership + rehash | returns `X-Deprecated: true` |

## “No Leak” Proof

See `server/test/idor.test.ts` for unit tests that prove:

- **workspaceId param mismatch** is rejected with **403**
- **non-member access** to another workspace’s exhibit is rejected with **403**
