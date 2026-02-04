# LexiPro Forensic OS Backend

## Structure
- routes/: API definitions and route composition.
- services/: Business logic and integrations (AI, audit, packaging, ingestion).
- middleware/: Security gates, grounding enforcement, and request guards.
- utils/: Shared helpers (hashing, signing, parsing).
- prisma/: Schema and database migrations.
- test/: Backend test suite.

## Key Flows
- AI: Routed through routes/aiRoutes.ts and enforced by grounding/guardrail middleware.
- Exhibits: Upload and access flows in routes/exhibitRoutes.ts with integrity verification.
- Audit: Read-only audit endpoints in routes/auditRoutes.ts with integrity validation.

## Development
- Install deps: npm install
- Run tests: npm test
- Run server: npm run dev
