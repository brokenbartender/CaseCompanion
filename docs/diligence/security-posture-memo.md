# One-Page Security Posture Memo

TO: Technical Due Diligence Committee  
FROM: LexiPro Engineering  
SUBJECT: Security, Trust, and Forensic Integrity Posture

Core Philosophy: LexiPro is built on the principle of "Negative Knowledge"?the system is designed to refuse action or output rather than risk an unverified claim. This posture minimizes malpractice liability and ensures 100% forensic admissibility.

## 1. Data Governance & RBAC

- Matter-Level Isolation: Data is strictly scoped by matterId and workspaceId. Cross-matter leakage is physically prevented at the middleware layer (authScope.ts).
- Zero-Persistence Policy: While case data is indexed, the system supports full "Memory Wipe" commands to satisfy strict data retention policies in sensitive litigation.

## 2. Forensic Integrity Chain

- SHA-256 Ingestion: Every file (PDF, Video, Audio, Web Capture) is hashed at the moment of entry. This hash is the "Source of Truth" for all subsequent citations.
- Immutable Audit Logs: The AuditEvent log uses a cryptographic "Next-Link" structure. Any attempt to modify the audit history breaks the hash chain, making tampering immediately detectable.

## 3. Hallucination Blockade (The Release Gate)

- Deterministic Retrieval: Unlike standard LLM "RAG" implementations, LexiPro enforces a hard-blocking Release Gate. If a statement cannot be mathematically anchored to a specific source byte, the system returns a 422 Unprocessable Entity error rather than a hallucinated response.

## 4. Visual Witness Chain of Custody

- Playwright Automation: Web evidence is captured via a headless browser, generating a forensic PNG and a text-extraction manifest simultaneously, both anchored to the same timestamp and forensic hash.
