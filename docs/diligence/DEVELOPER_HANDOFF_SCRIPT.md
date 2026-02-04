# Developer Handoff Script (5-Minute Walkthrough)

## 0:00 - 0:30 Intro
- “Welcome. This is a five-minute walkthrough for new engineers.”
- “We’ll cover: Hallucination Killer, Crypto Shredder key rotation, and Audit Chain verification.”

## 0:30 - 2:00 Hallucination Killer
- “The Hallucination Killer enforces grounding at the API boundary.”
- “Step 1: Vector retrieval selects allowed anchor IDs from evidence.”
- “Step 2: Regex citation gating rejects output without `<cite>` tags or with fabricated IDs.”
- “Step 3: Semantic Adversary verifies each claim is explicitly supported by the evidence text.”
- “If any step fails, the API returns a 422 with a refusal and logs the event.”
- “Key files: `server/services/HallucinationKiller.ts`, `server/services/SemanticAdversary.ts`, and the AI route handler.”

## 2:00 - 3:15 Crypto Shredder (Key Rotation)
- “Each workspace has a 256-bit key that encrypts data at rest.”
- “Rotation: generate a new key and re-encrypt stored data for that workspace.”
- “Shredding: delete the key. Without it, stored ciphertext is unrecoverable.”
- “Key file: `server/services/cryptoShredder.ts`.”
- “Rotate steps (high-level):”
  1. Generate new key.
  2. Decrypt with old key and re-encrypt with new key.
  3. Overwrite old key, persist new key.

## 3:15 - 4:15 Audit Chain Verification
- “Audit logs are chained: each record stores a hash of the previous record.”
- “Verification recomputes hashes and ensures continuity.”
- “Key file: `server/services/auditService.ts`.”
- “Command/usage: call `verifyAuditChain(workspaceId)`; failure returns the broken record.”

## 4:15 - 5:00 Wrap-up
- “If you change AI prompts or evidence schemas, update the tests.”
- “Run the grounding tests and audit chain tests before shipping.”
- “That’s it—welcome aboard.”
