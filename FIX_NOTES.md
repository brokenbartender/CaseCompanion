# Fix Notes

## Guardrails + Schema
- `server/forensics/forensicSchemas.ts`: added integrityHash to canonical grounded finding schema.
- `server/forensics/assertGroundedFindings.ts`: enrich findings with integrityHash and validate output.
- `server/forensics/releaseGate.ts`: standardized release gate payload + decision helper.

## API Enforcement
- `server/index.ts`: standardized 422 release gate responses; blocked ungrounded endpoints; added demo seed flag check; added proof-of-life flag.

## UI Enforcement
- `src/modules/CaseAssistant.tsx`: reject invalid findings and show WITHHELD message.
- `src/modules/Dashboard.tsx`: release gate counters, proof links, demo seed enablement.

## Tests
- `server/test/grounding.test.ts`: assert integrityHash in findings.
- `server/test/releaseGate.test.ts`: release gate payload + decision tests.

## Scripts + CI
- `scripts/verify-pillars.ps1`: one-command pillar verification (build/test/audit + gates).
- `scripts/verify-pillars.sh`: bash equivalent for CI/Unix.
- `.github/workflows/ci.yml`: run pillar verification in CI.

## Docs
- `HALLUCINATION_KILLER_SPEC.md`: canonical schema + 422 invariants.
- `HALLUCINATION_KILLER_TEST_PLAN.md`: test matrix and commands.
- `SYSTEM_PROOF_REPORT.md`: evidence table and payload samples.
