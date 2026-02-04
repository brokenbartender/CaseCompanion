
# LexiPro Forensic Logic Chain

This document outlines the end-to-end "Magic" of LexiPro to ensure the system remains maintainable by a standard engineering team.

## 1. Data Ingestion & Anchoring
- **Trigger**: File Upload via `EXHIBITS` module.
- **Process**:
  1. **SHA-256 Hashing**: Server computes hash before storage to prevent tampering.
  2. **PDF Layer Extraction**: Using `pdfjs-dist` on the server (`pdfProcessor.ts`).
  3. **Y-Coordinate Grouping**: Text items are grouped into "lines" based on vertical transform coordinates.
  4. **BBox Storage**: Each line's bounding box is stored in the DB as `[x, y, width, height]` alongside the text.

## 2. Forensic AI Synthesis
- **Trigger**: `Analyze Evidence` request in `ExhibitManager`.
- **Process**:
  1. **Prompt Library Selection**: Server fetches instruction from `server/prompts.json` using the `forensic_synthesis` key.
  2. **Zero-Temperature Generation**: Model runs at `temperature: 0.1` to maximize factual adherence.
  3. **Mandatory Citations**: The prompt forces the model to include `Exhibit:<id> Page:<n> Line:<n>` for every claim.
  4. **Grounding Verification**: Backend proxy returns JSON with a `sourced` boolean for each claim.

## 3. Human-In-The-Loop (HITL) Verification
- **Liability Shift**: This is the most critical part of the moat.
- **Process**:
  1. **Pending Status**: All AI findings start as `PENDING` (status: `false`).
  2. **Attorney Review**: Attorneys use the `VerificationHub` to view the AI claim alongside the original source (highlighted via BBox).
  3. **Manual Certification**: Clicking "Verify Finding" updates the record to `verified: true`.
  4. **Filtering**: Final outputs like `Settlement Demand` or `Prosecutor Brief` **only** use `verified: true` findings.

## 4. Tamper-Evident Audit Trail
- **Process**:
  1. **Hash Chaining**: Every `AuditEvent` stores a `prevHash` of the previous log.
  2. **Merkle-Style Verification**: A simple traversal of the log ensures that no forensic events have been modified or deleted.

## 5. Security Guardrails
- **Prompt Isolation**: System instructions are stored on the server and never sent to the client.
- **Multi-Tenancy**: `workspace_id` is enforced at the Prisma level on every query.
