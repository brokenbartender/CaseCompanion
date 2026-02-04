# Technical Due Diligence Packet

## Section 1: The Forensic OS Manifest
- Multimedia anchoring: "PDFs made of time." Video and audio are indexed as temporal text segments with SHA‑256 verification.
- Proactive investigation: The agent preserves web evidence before it changes, eliminating volatility risk.
- Buyer proof: Every output is bound to verifiable evidence, not a vendor promise.

## Section 2: Trust Attestation + Proof Contracts
- Every AI response produces a **proof contract** (policy + model + guardrails + release certificate metadata).
- A **replay hash** binds the proof contract to the exact claim‑proof rollup, preventing selective omission.
- A **trust attestation** endpoint returns proof contract + chain verification + ledger proof in one call.
- Proof packets export these artifacts for offline verification by any third party.

## Section 3: Technical Architecture & Data Flow
- Ingestion: Files (PDF/MP4/WAV) -> Hashing (SHA‑256) -> Vectorization (nomic-embed-text).
- Storage: Relational Metadata (Postgres) + Vector Space (pgvector) + Forensic Image/Media Vault.
- Logic: Agent Engine -> Release Gate (Anchor Check) -> UI Teleportation -> Trust Attestation.
- Output: Proof packets carry attestations + verifier script for independent review.

## Section 4: CTO Diligence FAQ
Q: Can the AI fabricate evidence?
A: No. The system requires a bi-directional anchor to a source chunk. No anchor = no output.

Q: How do you handle video tampering?
A: Every video is hashed on ingestion. The MediaFrame model allows for frame-by-frame verification if the source is challenged.

Q: Is it cloud-dependent?
A: No. The entire core (Ollama, pgvector, Node.js) is containerized and can run in a fully air-gapped, local environment for maximum security.

Q: Can a buyer validate this without privileged access?
A: Yes. Proof packets include all attestations and a verifier script for offline checks.

## Section 5: The "State v. Nexus" Golden Path (Script)
1. Discovery: Show the Risk Assessment conflict between the Police Report and the LinkedIn Web Capture.
2. Verification: Click the Police Report citation to jump to the PDF coordinates.
3. Cross-Exam: Click the Deposition citation; watch the video seek to the exact second with the Yellow Ring Flash.
4. The "Kill Shot": Show the LinkedIn Web Capture, proven by a forensic hash, revealing the witness's contradiction.
