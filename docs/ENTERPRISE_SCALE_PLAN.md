# Enterprise Scale Plan (M&A Readiness)

## AuditEvent / DocumentChunk Partitioning (PostgreSQL)
- Target: keep audit lookups < 250ms at 100M+ rows.
- Strategy:
  - Range partition `AuditEvent` by month on `createdAt`.
  - Optionally sub-partition by `workspaceId` if a single tenant dominates.
  - Apply the same approach to `DocumentChunk` for vector lookup locality.
- Rollout:
  1) Create new partitioned tables alongside existing.
  2) Backfill historical data by month.
  3) Swap read/write to partitioned tables via view or rename in a maintenance window.
  4) Add automated monthly partition creation job.

## KMS Integration (Release Certificate Signing)
- Goal: remove local private keys and use cloud-native HSM.
- Plan:
  - Add `KMS_PROVIDER` (AWS | AZURE) and `KMS_KEY_ID`.
  - Implement `signReleaseCertificate(payload)` via KMS.
  - Keep local RSA for dev/test only (guarded by `NODE_ENV !== "production"`).
- Benefits:
  - Centralized key rotation.
  - Auditability for every signing operation.

## Vector Performance Benchmarking
- Use `server/scripts/bench-vector.ts` to measure P50/P95 latency.
- Track results against requirements (sub-second P95 at target volume).

## Web Capture Security
- SSRF guardrails enforced in `webCaptureService`:
  - Block localhost/private IPs.
  - Optional allowlist for enterprise deployments.
