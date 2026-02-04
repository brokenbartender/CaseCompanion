# Hallucination Killer Test Plan

## Commands
- Build (client): `npm run build`
- Server tests: `npm --prefix server test`
- Audit: `npm run audit`
- Pillar verification: `scripts/verify-pillars.ps1` or `scripts/verify-pillars.sh`

## Test Categories
1) Grounding Unit Tests
   - Missing page_number -> 422
   - bbox wrong shape -> 422
   - anchorId not in workspace -> 422
   - integrityHash included in response
   - Reference: `server/test/grounding.test.ts`

2) Release Gate Unit Tests
   - ungrounded -> reject
   - empty rejectedCount -> allow
   - payload schema exact match
   - Reference: `server/test/releaseGate.test.ts`

3) IDOR / Workspace Scoping Tests
   - workspaceId/exhibitId mismatch -> 403
   - non-member access -> 403
   - Reference: `server/test/idor.test.ts`

4) Integrity Tests
   - hash mismatch revokes exhibit and logs event
   - hash match updates verifiedAt
   - Reference: `server/test/integrity.test.ts`

5) Health/Proof Tests
   - health endpoint returns ok
   - proof-of-life endpoint available when authenticated
   - Reference: `server/test/health.test.ts`

6) Embed Isolation Smoke Check
   - `embed-test.html` renders LexiPro in hostile CSS page
   - manual verification: UI renders, host page unchanged

