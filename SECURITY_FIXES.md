# Security Fixes Log

## 2026-01-19
- Baseline: `npm test` (includes `npm --prefix server test`) PASS.
- Fix 1: Cookie-based auth (remove localStorage token/claims) + CSRF + CSP.
  - Files: `index.html`, `src/services/authStorage.ts`, `src/services/api.ts`, `src/hooks/useSession.ts`, `src/components/AppLayout.tsx`, `src/components/Header.tsx`, `src/components/ExhibitViewer.tsx`, `src/modules/CaseAssistant.tsx`, `src/modules/VerificationHub.tsx`, `src/modules/ExhibitManager.tsx`, `src/modules/TimelineView.tsx`, `src/modules/AutoChronology.tsx`, `src/modules/Dashboard.tsx`, `src/modules/IntegrityAudit.tsx`, `src/modules/Login.tsx`, `server/index.ts`.
- Fix 2: Persist AI API keys with encryption at rest.
  - Files: `server/index.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/20260119094500_workspace_secret/migration.sql`, `.env.example`.
- Fix 3: Persist OIDC state in DB.
  - Files: `server/index.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/20260119095000_oidc_state/migration.sql`.
- Fix 4: Harden legacy JWT bypass in production + test coverage.
  - Files: `server/index.ts`, `server/test/legacy-jwt.test.ts`.
- Fix 5: Gate demo seed in prod + role/approval checks + tests.
  - Files: `server/index.ts`, `server/test/demo-seed.test.ts`.
- Fix 6: Make trust proxy configurable.
  - Files: `server/index.ts`, `.env.example`.
- Fix 7: Restrict health endpoint details in production.
  - Files: `server/index.ts`.

## 2026-02-01
- Fix 8: Tighten CSP for production (remove `unsafe-inline`/`unsafe-eval`) + document exceptions.
  - Files: `nginx.security.conf`, `docs/SECURITY_CSP_EXCEPTIONS.md`.

## 2026-01-25
- Critical: Hardened DEMO_MODE approval bypass with ISOLATED_ENV check.
  - Files: `server/index.ts`, `.env.example`, `server/test/demo-approval.test.ts`.
- High: Implemented SSRF protection and timeouts for Intake Webhook.
  - Files: `server/index.ts`, `server/webhookSecurity.ts`.
- High: Removed unsafe-inline/unsafe-eval from CSP.
  - Files: `server/index.ts`, `nginx.security.conf`.
- Infrastructure: Fixed Docker Compose port mappings and DB healthchecks.
  - Files: `docker-compose.yml`.
