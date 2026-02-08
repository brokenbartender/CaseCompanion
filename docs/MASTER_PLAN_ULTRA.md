# Master Plan Ultra — CaseCompanion End‑to‑End Case OS

Last updated: 2026-02-07

**Purpose**
Build a court‑ready, evidence‑anchored case operating system for Michigan civil matters, with dual‑track support for assault cases and wage/retaliation/employment cases. Outputs must be admissibility‑grade, auditable, and safe (no ungrounded claims).

**Sources Integrated**
- `docs/PLAN_SNAPSHOT_MCKENZIE_SNYDER.md` (case‑specific master plan)
- `BACKLOG.md` (product backlog for Michigan pro‑se workflows)
- `docs/LEGAL_OS_BACKLOG.md` (master cumulative backlog with execution phases)
- `docs/ENTERPRISE_SCALE_PLAN.md` (scale/partitioning/KMS)
- `docs/OBSERVABILITY.md` (metrics/logs/traces)
- `HALLUCINATION_KILLER_TEST_PLAN.md` (verification test suite)
- Takeout evidence packet + summaries + timelines (extracted from Gmail Takeout attachments)

**Product End Goal**
An end‑to‑end case platform that ingests evidence, enforces procedural gates, computes damages, produces court‑compliant exports, and maintains an immutable audit trail. The system must generate an admissibility‑grade packet layout and ensure every claim is grounded in evidence anchors.

**Non‑Goals**
- No legal advice, strategy, or automatic filing.
- No export or generation without evidence anchors and pre‑file audit passing.

---

**System Pillars**
1. Evidence integrity and chain‑of‑custody are mandatory.
2. All outputs are grounded to exhibits with verifiable anchors.
3. Procedural gating mirrors Michigan civil workflows.
4. Court‑compliant formatting and export validation.
5. Every critical action is audited.

---

**Core Data Model (Functional View)**
- Case (Matter): jurisdiction, court profile, deadlines, status, track type.
- Evidence: files, hashes, metadata, provenance, integrity state.
- Anchors: citations to evidence with page/bbox.
- Timeline Events: date, category, linked evidence.
- Packet Sections: layout template + required evidence links.
- Audit Events: immutable ledger entries for every critical action.
- Damages: wage loss, medical totals, wage theft, workers’ comp.
- Party/Stakeholder: plaintiff, defendant, witnesses, counsel, agencies.
- Exports: packet manifests, checksums, signatures.

---

**Canonical Packet Layout (From Takeout Evidence Packet)**
Required section order and enforcement:
1. Incident Documentation
2. Medical Evidence
3. Employer Negligence Evidence
4. Retaliation Evidence
5. Wage Theft Evidence
6. Workers’ Comp Evidence
7. Additional Misconduct Evidence

**Packet Outputs (Generated from Layout)**
- Evidence Index
- Case Summary
- Master Timeline
- Retaliation Timeline
- Termination Summary
- Workers’ Comp Violation Summary
- Damages Summary
- Wage Loss Summary
- Medical Records Summary
- Key Facts One‑Pager
- Why This Case Has Value
- What I Need From Counsel
- Questions for Attorneys

---

**Primary Case Workflows**
1. Intake and Case Setup
- Jurisdiction routing, court profile, filing readiness checklist.
- Service method wizard and deadlines engine.
- Court holiday editor and rule‑based timeline.

2. Evidence Ingestion
- Evidence vault with hash integrity and audit trails.
- OCR, metadata extraction, and chain‑of‑custody logging.
- Redaction pipeline and MC 97 compliance gate.

3. Evidence Anchoring and AI Guardrails
- Anchors required for summaries, timelines, and exports.
- Release gate: block ungrounded outputs.
- Integrity badge and audit links visible in UI.

4. Timeline and Narrative
- Master timeline builder with evidence links.
- Specialized timelines: retaliation, termination, assault events.
- Narrative dossier strictly anchored.

5. Damages and Loss Calculations
- Wage loss (AWW‑based), wage theft ledger, liquidated damages toggle.
- Medical bill totalizer and benefits ledger.
- Workers’ comp compliance and benefits owed.

6. Packet Generation
- Layout validation against required sections.
- Evidence index compiled from linked exhibits.
- Export manifests, digital signatures, and audit entries.

---

**Dual‑Track Separation**
- Assault track stays independent from wage/retaliation track.
- Wage/retaliation outputs are isolated unless explicitly linked by evidence.
- Separate export packets per track.

---

**Court Approval Requirements (Mandatory Gates)**
- SCAO formatting compliance.
- Auto‑validation before export (signature, PII, deadlines, attachments).
- CourtProfile overrides (Oakland Circuit + 50th District).
- SCAO form library (MC 01/01b/03/07/07a/11/12/13/19/97).
- Service proof packaging (MC 11).
- Exhibit index and binder generation.
- Pre‑file audit module (signature, PII, deadlines, attachments).
- Packet layout validation and completeness checklist.

---

**Security / Glass Citadel Layer**
- C2PA provenance.
- ZKP model integrity.
- Deterministic forensic outputs.
- Sub‑frame analysis and NeRF/3D reconstruction.
- Anti‑prompt‑extraction and secure token strategy.
- Chain‑of‑custody and audit manifest.

---

**Observability**
Metrics:
- LLM latency p50/p95
- Retrieval latency
- Token usage per request
- Error rates by provider

Logs:
- Prompt and response IDs (no raw content)
- Policy decision logs
- Audit event IDs

Traces:
- Request → retrieval → generation → verification

---

**Testing and Verification**
Use `HALLUCINATION_KILLER_TEST_PLAN.md` as the acceptance bar:
- Grounding unit tests
- Release gate tests
- IDOR/workspace scoping tests
- Integrity tests
- Health/proof tests
- Embed isolation smoke checks

---

**Enterprise Scale Plan (M&A Readiness)**
- Partition `AuditEvent` and `DocumentChunk` by month and optionally workspace.
- KMS integration for release certificate signing.
- Vector performance benchmarking.
- Web capture SSRF guardrails.

---

**Backlog Integration**
The master backlog is the canonical source of all feature ideas:
- `docs/LEGAL_OS_BACKLOG.md` contains 800+ items and optimized execution phases.
- `BACKLOG.md` contains Michigan pro‑se specific epics and roadmap.

This master plan aligns all major functional areas to these sources and adds the Takeout‑derived packet layout and damages modules as required outputs.

---

**Execution Roadmap (Integrated)**
Phase 1: Foundations and Evidence Integrity
- Data model completeness
- Evidence vault with hash integrity
- Audit ledger and integrity UI

Phase 2: Packet Core and Court Compliance
- Packet layout generator and validation
- Evidence Index and packet manifest
- SCAO formatting and pre‑file audit gate

Phase 3: Timelines and Narrative
- Master timeline
- Retaliation and termination timelines
- Evidence‑anchored narrative dossier

Phase 4: Damages Engine
- Wage loss ledger
- Medical bill totalizer
- Workers’ comp benefits calculator
- Wage theft + liquidated damages

Phase 5: Trial Prep and Export Quality
- Witness packets
- Exhibit order list
- Trial notebook export

Phase 6: Observability and Enterprise Scale
- Metrics/logs/traces
- Partitioning and KMS signing

---

**Evidence Anchors (Assault Track)**
- Police report OCSO 25‑195158
- Trinity Health ER summary
- Medical bills
- Video transcripts and analysis
- Victim and witness statements
- FOIA confirmation F009063‑123025
- Settlement demands (Dec 30, 2025 and Jan 7, 2026)
- Evidence Packet Index and Evidence Index
- Master Timeline

**Evidence Anchors (Wage/Retaliation Track)**
- MDCR summary case #662239
- WC‑117 + submission confirmation
- Non‑compliance report to WDCA
- Retaliation timeline + termination summary
- Lost wages summary
- UIA redetermination + determinations
- Crime Victim Compensation application + resources

---

**Definition of Done (End State)**
- End‑to‑end intake → evidence → timeline → damages → packet export.
- Strict evidence anchoring with release gate.
- Court‑compliant, audited exports with signatures and manifests.
- Dual‑track separation enforced.
- Observability and test plan passing.

