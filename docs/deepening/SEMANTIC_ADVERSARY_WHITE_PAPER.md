# Semantic Adversary White Paper

## Overview
The Semantic Adversary upgrades the Hallucination Killer from syntax-only checks to meaning-level verification. It tests whether each cited evidence segment explicitly supports the claim that references it. This prevents "citation laundering" where a model attaches a real anchor to an unsupported statement.

## Architecture
1. **Citation Gate (Syntax):** `HallucinationKiller` parses `<cite>` tags and enforces an allowlist of anchor IDs per response.
2. **Semantic Adversary (Meaning):** For each cited claim, the system runs a low-temperature LLM check:
   - Prompt: *"You are a logical auditor. Does the following text EXPLICITLY support the claim? Answer only TRUE or FALSE."*
   - Evidence text and claim are provided.
   - Only an exact "TRUE" response is accepted.
3. **Fail Closed:** Any uncertainty, missing evidence text, or non-TRUE response results in rejection with HTTP 422.

## Trust Boundary
- **Input:** Evidence text only (sanitized).
- **Output:** Boolean verdict.
- **Policy:** If confidence is less than 100 percent, the verdict is **false**.

## Operational Modes
- **Gemini Flash (default):** Low-latency semantic checks using `gemini-1.5-flash`.
- **Local fallback:** Optional local model for air-gapped deployments.
- **Deterministic test mode:** A strict string containment check for unit tests.

## Benefits for Acquisition
- **Tamper-evident reasoning:** Every claim is tied to a verifiable evidence segment.
- **Risk reduction:** Prevents false confidence from mismatched citations.
- **Auditable control:** Rejections are logged as structured failures for compliance review.

## Integration Summary
- `server/services/SemanticAdversary.ts`: LLM-based logical verification service.
- `server/services/HallucinationKiller.ts`: Calls Semantic Adversary for every citation.
- `server/index.ts`: Rejects responses with semantic mismatches using 422 status.
