# Contributing to LexiPro: Strict Data Mode Protocol

All future development must adhere to the **Billion-Dollar Asset Integrity Standards**. Violations of these rules will compromise the technical handover value of the codebase.

## 🏛 Core Development Principles

### 1. Mandatory Audit Metadata
Every new AI-generated object or interface must implement the `AuditMetadata` type from `types.ts`. This includes `model_version`, `agent_id`, and a cryptographic `integrity_hash`.

### 2. Source-Anchoring Requirement
Do not implement "Narrative Only" prompts. Every Micro-Agent MUST be instructed to provide a `source_anchor`. 
- **Bad:** "The defendant hit the plaintiff."
- **Good:** "The defendant initiated contact at 00:44.2 (Exhibit A)."

### 3. PII & Privacy Guardrails
- Never log raw forensic data to the browser console in production environments.
- Always use the `PRIVACY_HEADER` constant when defining new system instructions in `geminiService.ts`.
- Ensure the `do_not_train` equivalent intent is maintained in all GenAI configurations.

### 4. White-Label Compliance
Do not hardcode strings. All UI labels, brand names, and jurisdictional references must reside in `services/CaseConfig.ts`. Use the `CASE_CONFIG` object throughout the frontend.

### 5. Null-State Determinism
Functions handling financial or statutory calculations must handle `undefined` or empty states by returning a deterministic "No Evidence Found" code rather than a generated estimate.

## 🧪 Testing Requirements
- **Forensic Accuracy:** All new prompts must be tested against "Trauma Logic" scenarios to ensure no hallucinations.
- **Interoperability:** Ensure JSON-LD outputs remain compatible with the schema defined in `TechnicalHandover.tsx`.

---
*Authorized Personnel Only. Development access is logged via Compliance Matrix.*
