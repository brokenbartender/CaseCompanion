# Hallucination Killer Spec (PRP-001 Release Gate)

## Definition: Grounded Finding (Canonical Schema)
All admissible findings MUST conform to this schema. Any deviation -> HTTP 422.

Required fields:
- exhibitId: string
- anchorId: string
- page_number: integer (>= 0)
- bbox: [number, number, number, number] (finite numbers; normalized)
- integrityHash: string (SHA-256 lineage reference for the exhibit)

Optional fields:
- quote: string
- confidence: number (0..1)

Schema reference:
- `server/forensics/forensicSchemas.ts` -> `forensicFindingSchema`

## Rejection Policy (No Anchor -> No Output)
If any claim lacks required grounding or fails validation:
- The system MUST return HTTP 422.
- The system MUST NOT return partial or ungrounded text.
- Error payload:
  - errorCode: "NO_ANCHOR_NO_OUTPUT"
  - message: "No Anchor -> No Output (422)."
  - totalCount, rejectedCount, reasons[]

Helper reference:
- `server/forensics/releaseGate.ts`

## End-to-End Invariants
1) Every AI response that returns claims or findings is validated against the canonical schema.
2) Anchor IDs are verified to belong to the requesting workspace.
3) Exhibit integrity hash is included in every finding.
4) Any violation triggers 422 at the API boundary (no UI rendering of ungrounded output).
5) Audit log records ACCEPTED or RELEASE_GATE_BLOCKED decisions.

## API Enforcement Points
- `/api/ai/chat` (anchored chat, 422 on any ungrounded claim)
- `/api/ai/timeline`, `/api/ai/outcome`, `/api/ai/damages` (blocked by release gate)
- `/api/gemini/generate` (blocked by release gate)

## UI Enforcement
The UI must never render findings unless they pass the required fields:
- Exhibit ID
- Anchor ID
- page_number
- bbox
- integrityHash

Reference:
- `src/modules/CaseAssistant.tsx` (schema checks before render)

