# Technical Diligence Manifest (v2026.1)

## Pillar 1: Deterministic Evidence Anchoring
- Every claim binds to a concrete source coordinate (DocumentChunk UUID + page/line/bbox), not a fuzzy citation.
- Temporal evidence resolves to exact seconds, enabling frame-accurate cross‑examination.
- Web captures preserve both pixels and text, so volatile sources remain provable.

## Pillar 2: Cryptographic Chain of Custody
- Every exhibit is fingerprinted at ingestion (SHA‑256), creating immutable provenance from day one.
- AuditEvent hash chaining makes edits detectable and verifiable outside the database.
- Ledger attestation exposes head hash + event counts so third parties can independently verify integrity.
- Packetized proof allows offline verification with no privileged access.

## Pillar 3: Proof Contracts & Replay Integrity
- Each AI release produces a proof contract that seals policy + model + guardrails metadata.
- Replay hashes bind contracts to claim‑proof rollups, preventing selective editing or omission.
- Contracts and hashes are exported in proof packets for independent replay checks.

## Pillar 4: Hallucination-Resistant Output
- Release Gate blocks any claim without a valid anchor (422 + audit trail).
- Unified retrieval across documents and media keeps outputs inside the evidence boundary.

## Pillar 5: Proactive Autonomous Investigation
- URLs trigger capture before analysis so evidence is preserved before it changes.
- Source conflicts are detected and flagged as high‑severity risks.

## Pillar 6: System of Record Governance
- Deterministic extraction paths make outputs reproducible and auditable.
- One‑touch demo reset recreates a clean forensic state on demand.

## Strategic Status: Diligence-Ready
The codebase is in a locked, stable state suitable for technical diligence.

## Agent Dossier
- See `docs/AGENTS.md` for the agent architecture summary and implementation reference map.
