AGENTS (LexiPro Forensic OS)
============================

Purpose
-------
This document describes the agent architecture used in LexiPro Forensic OS for
forensic auditing, evidence-bound reasoning, and demo narration. It is written
for diligence and partner review and avoids internal secrets or source code.

Overview
--------
The agent system is a controlled orchestration layer that:
- accepts a user goal,
- constrains the agent to evidence-bound tools,
- enforces safety and admissibility rules,
- records audit events for every step,
- and returns a finalized, evidence-grounded response.

Core Agent Engine
-----------------
The agent engine:
- Builds a strict system prompt defining domain boundaries, tone, and admissibility.
- Injects case context (case name/id/slug) to prevent cross-case leakage.
- Executes a bounded number of steps to avoid runaway behavior.
- Requires a context-hash on each step to prevent unanchored inferences.
- Records audit events for tool execution, success, and timeouts.
- Supports streaming traces for UI display.

Proactive Evidence Capture
--------------------------
If a user goal contains a URL, the agent immediately triggers web capture to
preserve chain-of-custody before any reasoning occurs. If a capture conflicts
with internal exhibits, the system flags a source conflict.

Safety and Guardrails (AIGIS)
-----------------------------
Before any action or response:
- Safety rules are evaluated (AIGIS policy).
- Disallowed requests are blocked with a consistent error message.
- The agent refuses off-domain questions and unverified features.

Tooling (Evidence-Bound Actions)
-------------------------------
The agent may only act through a fixed set of forensic tools:
- Web evidence capture (forensic screenshot + text indexing).
- Evidence search across case files.
- Cross-reference entities across exhibits.
- FRE 902(13)/(14) validation helper.
- Conflict analysis across anchored statements.
- ICD-10 term mapping (limited, demo-safe mapping).
- Suspicious transfer scan (forensic finance demo).
- Document read (evidence snippet extraction).
- Metadata analysis (size, integrity hash, status).
- Integrity verification (hash validation).

Every tool invocation is audited, and tool outputs are hashed for deterministic
context continuity.

Evidence Integrity and Heartbeat
--------------------------------
When reading or analyzing evidence, the engine:
- verifies the exhibit hash lineage,
- emits a deterministic heartbeat record,
- and records alert events on mismatch.
Integrity breaches trigger a high-severity alert with immutable audit logging.

UI Surfaces and Experience
--------------------------
The agent has a dedicated UI experience designed for diligence demos:
- A floating AIGIS bubble shows live status, heartbeat, and trace.
- Thought/action/observation traces render with evidence snippets.
- Diagnostic mode can surface route and heartbeat diagnostics.
- Demo narration aligns with ingest/seal/stamp stages.

State and Session Behavior
--------------------------
The agent experience is scoped to the active workspace and case. Demo mode and
diagnostic mode are session-scoped, preventing bleed into normal usage.

Limits
------
- The agent will not respond with ungrounded claims.
- If a request exceeds step limits, it returns a safe timeout response.
- If a feature is not in approved specs, the agent defers to the roadmap.

Auditability and Admissibility
------------------------------
- All agent actions are captured in the audit ledger.
- Evidence-based outputs are anchored to exhibits.
- FRE 902(13)/(14) readiness signals are provided for admissibility checks.
- Chain-of-custody is maintained across captures and analysis.

Extension Points
----------------
The agent system supports:
- Additional tools (registered and described in the tool catalog).
- Case-specific prompt constraints.
- UI trace rendering for new action types.
- Tool-gated execution for operator approval when required.

Summary
-------
LexiPro's agent system is not a general-purpose chatbot. It is a forensic
auditor constrained to evidence, audited at every step, and designed to
produce admissible, traceable outputs suitable for diligence review.

## Implementation Reference Map

| Agent / Component | Primary Source File | Key Responsibility |
| :--- | :--- | :--- |
| **Aigis (Safety Sentinel)** | `server/services/aigisShield.ts` | Hallucination detection & liability filtering. |
| **Release Gate (Optical)** | `server/forensics/releaseGate.ts` | Pixel-verifiable export blocking (The "Red Button"). |
| **Forensic Engine** | `server/services/IngestionPipeline.ts` | Chain-of-custody tracking & hash generation. |
| **Auto-Discovery** | `server/agent/agentEngine.ts` | Autonomous evidence sorting and classification. |
| **UI Feedback Loop** | `src/modules/CaseAssistant.tsx` | Real-time "Withheld" notifications & user guidance. |
| **Immutable Audit** | `server/integrity/assertIntegrity.ts` | WORM-compliant logging & cryptographic sealing. |
