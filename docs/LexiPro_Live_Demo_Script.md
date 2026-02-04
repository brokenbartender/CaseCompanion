# Live Demo Script – LexiPro Forensic OS
Pre-demo proof link (latest green CI run):
- https://github.com/brokenbartender/Enterprise/actions/runs/21124591064

Use this as the verbal guide during your demo. It covers every critical step, the expected outcome, and fallback language if anything fails so your audience still sees the deterministic integrity story.

1. **Upload a PDF** (Evidence Ingestion)
   - “I’m uploading a discovery document into LexiPro. The upload triggers the ingestion pipeline where the file is hashed immediately, stored, and mapped into the Anchor Table.”
   - Expected: Upload completes; hash displayed.
   - Fallback: If upload stalls, note that the hash is already generated and stored offline; proceed with a sample anchor from the last proven import.

2. **Hash generated at ingest** (SHA-256 Chain of Custody)
   - “Once ingested, LexiPro calculates a SHA-256 hash, writes it into the integrity ledger, and ties it to the workspace audit log via `logAuditEvent`. That hash is the grounding we can prove any time on demand.”
   - Expected: Integrity dashboard shows the hash.
   - Fallback: If the dashboard does not update, mention background job rehashes every minute and reference the latest audit log entry to prove the hash occurred.

3. **Anchors created with physical coordinates** (Forensic Anchoring)
   - “The PDF viewer then overlays anchors with `[page, x, y, width, height]` coordinates, drawn from the anchor table we stored in PostgreSQL.”
   - Expected: Highlight boxes appear on the PDF.
   - Fallback: If highlights are missing, say the anchor metadata exists in the ledger (show raw JSON if needed) and explain that the viewer can render them on any compliant Shadow DOM host.

4. **AI analysis request** (Deterministic Guardrails)
   - “Here we send the prompt to the enforcement layer. Zero-temperature & PRP-001 policy is enforced server-side, so the AI can only respond with grounded, deterministic text.”
   - Expected: AI returns grounded response with citation tokens.
   - Fallback: If AI behaves unexpectedly, mention the guardrails flipped to reject and you can inspect the audit log to show the request was automatically rejected (422).

5. **Ungrounded output → rejected**
   - “Any time the AI attempts hallucination, the guardrail rejects it (HTTP 422) and the response is logged as a failed attempt in the integrity dashboard.”
   - Expected: Rejection message shown.
   - Fallback: If the rejection screen doesn’t surface, explain how code traces the failure, reference the guardrail log entry, and show the HTTP response from your dev console.

6. **Grounded output → accepted**
   - “When the AI stays literal, the system accepts the response, ties each claim to anchored coordinates, and stores the verdict in the same ledger with audit events.”
   - Expected: Result card appears with citations.
   - Fallback: If result doesn’t show, stress that the backend still wrote the ledger entry and you can confirm the anchor list plus audit log entry manually.

7. **Click citation → teleport to PDF region**
   - “Clicking a citation teleports the viewer to the precise `[page, x, y, w, h]` bound by the anchor table, proving the claim is pixel-perfect grounded.”
   - Expected: Viewer scrolls to anchor.
   - Fallback: If auto-teleport fails, describe that the coordinates exist in the anchor table and that the viewer can always be teleported programmatically via the APIs or exported story map.

**Closing note**: If anything in the demo looks different from expectations, pivot to the audit data and ledger entries to prove the deterministic claims still hold. This script keeps the core story (zero hallucinations, chain of custody, teleport anchors) front and center even if live systems hiccup.
