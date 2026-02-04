# Architecture Overview

```
Client UI
  ├─ Evidence Viewer / Teleport
  └─ AI Chat (Hallucination Killer)
        │
        ▼
API Server
  ├─ Exhibit Ingest + Anchor Extraction
  ├─ Release Gate + Audit Logger
  ├─ Proof Packet Generator
  └─ Verification Endpoints
        │
        ▼
Storage + DB
  ├─ Evidence Blobs (hashed)
  ├─ Anchor Index
  └─ Audit Chain (hash-linked)
```

## Key Services
- `server/services/forensicSubstrate.ts`: integration boundary.
- `server/services/packagingService.ts`: proof packet export + manifest hashing.
- `server/audit.ts`: audit logging + integrity chain.

## Evidence Flow
1. Ingest file → hash → anchors generated.
2. AI response → Hallucination Killer → release gate.
3. Terminal audit event recorded.
4. Proof packet exported (evidence + audit chain + manifest).
