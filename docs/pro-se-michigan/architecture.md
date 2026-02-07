# Architecture Overview

Not a lawyer. Not legal advice. Procedural help + document organization only.

## Core Flow
1. Case profile captures filing + service dates.
2. Rule engine computes deadlines (base Michigan rules + overrides).
3. Service attempts + evidence items are recorded.
4. PII scan runs before any public export.
5. Export packets include manifest hashes + audit log excerpts.

## Domain Objects
- Case, Party, CourtProfile, SchedulingOrder
- ProceduralDeadline, CaseDocument, ServiceAttempt
- EvidenceItem (maps to existing Exhibit where possible)
- ExportPacket, RiskRule

## Integration Points
- `server/services/proceduralRules.ts`: rule evaluation + persistence
- `server/services/piiScanService.ts`: scan + MC97 list generator
- `server/services/filingPacketService.ts`: filing packet assembly
- UI uses `src/modules/CaseStatusDashboard.tsx` to surface next actions
