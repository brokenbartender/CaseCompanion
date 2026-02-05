# CaseCompanion Backlog

This backlog maps the Michigan civil case lifecycle (benchbook-driven) and legal-design UX principles into buildable work.

## Epics
- E1 Case Journey (Benchbook-driven phases)
- E2 Evidence & Forensics (PDF/video integrity + admissibility)
- E3 Discovery Suite (RFPs, interrogatories, RFAs, subpoenas)
- E4 Motions & Pretrial (summary disposition, adjournments, defaults)
- E5 Trial Prep & Trial Mode (voir dire, objections, witness exam)
- E6 Damages & Settlement (medical, wage, business loss)
- E7 Privacy, PII, and Compliance (MC 97/MC 20 workflows)
- E8 Design System & Accessibility (legal-design-driven UX)

## Completed
1. **E1** Master Checklist + Case Journey Dashboard
2. **E1** Oakland County filing flow (court selector + MiFILE)
3. **E1/E7** Service of process workflow
4. **E1/E7** Deadline risk monitor
5. **E1/E2** RAM evidence validator
6. **E2** Evidence Vault tagging + filters
7. **E2** OSAC/SWGDE forensic workflow compliance
8. **E2/E5** Video admissibility & demonstrative evidence
9. **E3** Discovery Suite (Interrogatories/RFP/RFA)
10. **E3/E4** Default + Mediation readiness
11. **E4** Motion Builder + Summary Disposition Planner
12. **E5** Trial Prep Core
13. **E5** Voir Dire Designer
14. **E6** Damages + Restitution
15. **E6** Settlement Demand Generator
16. **E7** Privacy + Victim Safety
17. **E7** Victim Rights + Self-Help Resources

## Backlog Items
1. **E1** A-to-Z document pack builder
- Steps: summons MC 01, complaint MC 01a, fee waiver MC 20, file naming rules

2. **E2** Exhibit Detail expansion
- Steps: transcript attachment + timeline binding, authenticity report download, keyframes/contact sheet

3. **E2** Video content analysis (VCAT-style)
- Steps: object detection, OCR, speech-to-text with timestamps, prompt-based search

4. **E2** Layout-aware document parsing (DeepDoc)
- Steps: OCR + layout + table structure extraction for PDFs/forms

5. **E7** Statutory & Criminal Context References
- Steps: MCL 750.81 summary + M Crim JI 13.1/13.2 reference panel

6. **E8** UI/Accessibility System
- Steps: legal-design UI kit, widget library, accessibility pass, dashboard specs

7. **E2/E8** Lawma classifier for auto-tagging
- Steps: add document type classifier for police/medical/witness/video, map tags to modules, test against labeled examples

8. **E8** Research/Benchmark consolidation (non-blocking)
- Steps: combine OpenContracts/OpenClaw/SSRN, LegalBench, OLAW, Legal Text Analytics, Awesome LegalAI, LegalNexus; shortlist US-relevant tools and QA guardrails

## Roadmap Tracker

Status legend: `planned` `in_progress` `done`

| Phase | Goal | Items | Status |
| --- | --- | --- | --- |
| Phase 1 | Core civil-case flow + evidence | E1, E2 | in_progress |
| Phase 2 | Discovery + motions | E3, E4 | in_progress |
| Phase 3 | Trial prep + damages + settlement | E5, E6 | in_progress |
| Phase 4 | Privacy + UX system + accessibility | E7, E8 | in_progress |

## Dependencies
- E1 depends on civil benchbook mapping completion.
- E2 depends on evidence ingestion + forensics pipeline stability.
- E3 depends on E1 core workflow and evidence tagging.
- E4 depends on E3 discovery timeline.
- E5 depends on E1/E2 for exhibits and evidence access.
- E6 depends on E2 evidence + E1 timeline + E5 trial framing.
- E7 depends on E1 intake flows.
- E8 depends on final IA for E1-E7.
