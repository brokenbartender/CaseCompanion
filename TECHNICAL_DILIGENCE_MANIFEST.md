# TECHNICAL DILIGENCE MANIFEST

## What the system guarantees
- Determinism: Responses are bounded to ingested evidence. If a claim cannot be anchored, the system blocks output.
- Anchoring: Every claim is mapped to DocumentChunk UUIDs, page coordinates, or media timestamps.
- Auditability: Exhibit ingestion and access are recorded in hash-linked AuditEvent chains.

## Reproduce the demo (one command)
```
npm run demo:reset
```

Cross-platform options:
- `npm run demo:reset:win` (PowerShell)
- `npm run demo:reset:unix` (bash)

## What "PASS" means
The demo readiness check confirms:
- The "State v. Nexus" workspace exists.
- At least one video exhibit exists and has TranscriptSegments.
- A Risk Assessment entry exists for the workspace.

A PASS indicates the demo data is complete and the UI can resolve citations.

## Known limitations
- pdfjs font warning: The demo may log a LiberationSans font warning; rendering remains functional.
- Local Ollama dependency: Demo embeddings require a local Ollama instance with `nomic-embed-text`.
- pgvector extension: The database must have the `vector` extension installed.

## Data flow (high level)
```mermaid
flowchart LR
  A[Exhibit Upload/Seed] --> B[SHA-256 Hash]
  B --> C[Storage (uploads/S3)]
  A --> D[Ingestion Pipeline]
  D --> E[DocumentChunk / TranscriptSegment]
  E --> F[Vector Store (pgvector)]
  E --> G[Anchors + Citations]
  G --> H[Release Gate]
  H --> I[UI Teleport + Proof Packet]
  A --> J[AuditEvent Chain]
  J --> I
```

## Acquisition readiness checklist
- [x] Immutable Audit
- [x] Hallucination Killer
- [x] Proof Packaging
