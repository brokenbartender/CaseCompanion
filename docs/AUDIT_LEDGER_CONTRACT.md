# Audit Ledger Contract

This document defines the non-negotiable audit guarantees for LexiPro's forensic pipeline.
It is intended for acquisition diligence and integration validation.

## Terminal Event Rules
- Every AI attempt produces **exactly one** terminal event.
  - Allowed terminal events: `AI_CHAT_RELEASED` or `AI_RELEASE_GATE_BLOCKED`.
- Terminal events must include a deterministic `requestId` in the payload.
- Non-terminal events (e.g., progress or retries) **must not** be used to prove a response outcome.

## Withheld Response Requirements
- Every withheld response returns:
  - `auditEventId` (required)
  - `withheldReasons` (required, array)
  - `errorCode` = `WITHHELD`
- `auditEventId` must point to the terminal `AI_RELEASE_GATE_BLOCKED` entry.

## Proof Packet Linkage
- Every proof packet includes:
  - `chain_of_custody.json` (raw audit events)
  - `chain_verification.json` (validation result + `auditEventIds`)
  - `forensic_artifacts/audit_attestation.json` (ledger proof + chain verification snapshot)
- `chain_verification.json.auditEventIds` MUST match the event ids present in `chain_of_custody.json`.

## Integration Checklist
1. Submit an AI request.
2. Verify **exactly one** terminal event with the request's `requestId`.
3. If withheld, confirm the API response `auditEventId` matches the terminal event id.
4. Export a proof packet and verify the event id is present in `chain_of_custody.json` and listed in `chain_verification.json.auditEventIds`.
