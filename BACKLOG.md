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

## Backlog Items
1. **E1** Master Checklist + Case Journey Dashboard
- Steps: phase list, required docs, status tracking, next-action button, timeline highlights

2. **E1** Oakland County filing flow (court selector + MiFILE)
- Steps: 52nd vs 6th circuit selector, MiFILE registration, initiation wizard, fee waiver path

3. **E1** A-to-Z document pack builder
- Steps: summons MC 01, complaint MC 01a, fee waiver MC 20, file naming rules

4. **E1/E7** Service of process workflow
- Steps: who can serve, 90-day timer, proof-of-service upload, reminders

5. **E1/E7** Deadline risk monitor
- Steps: service + motion deadlines, alerts, calendar integration

6. **E1/E2** RAM evidence validator
- Steps: evidence intake checklist, RAM scoring, integrity warnings

7. **E2** Evidence Vault tagging + filters
- Steps: Authority/Evidence/Damages, phase tags, filters

8. **E2** Exhibit Detail expansion
- Steps: transcript attachment + timeline binding, authenticity report download, keyframes/contact sheet

9. **E2** OSAC/SWGDE forensic workflow compliance
- Steps: working-copy policy, hash verification pre/post, processing + discrepancy logs, intake form

10. **E2/E5** Video admissibility & demonstrative evidence
- Steps: Silent Witness checklist, format/codec guidance, demonstrative exhibit builder

11. **E2** Video content analysis (VCAT-style)
- Steps: object detection, OCR, speech-to-text with timestamps, prompt-based search

12. **E2** Layout-aware document parsing (DeepDoc)
- Steps: OCR + layout + table structure extraction for PDFs/forms

13. **E3** Discovery Suite (Interrogatories/RFP/RFA)
- Steps: template library, timing rules, send/export

14. **E3/E4** Default + Mediation readiness
- Steps: answer deadline tracker, default motion checklist, settlement/exhibit packet checklist

15. **E4** Motion Builder + Summary Disposition Planner
- Steps: motion outline, element checks, auto-citations

16. **E5** Trial Prep Core
- Steps: trial notebook, witness exam planner, objection helper, narrative testimony coach

17. **E5** Voir Dire Designer
- Steps: bias checklists, question bank, printable sheet

18. **E6** Damages + Restitution
- Steps: medical totals, collateral source notes, wage + business loss, out-of-pocket tracker

19. **E6** Settlement Demand Generator
- Steps: pull damages, exhibit citations, export PDF

20. **E7** Privacy + Victim Safety
- Steps: PII guard (MC 97), confidentiality prompts, protective order prompts

21. **E7** Victim Rights + Self-Help Resources
- Steps: rights compliance checklist, SCAO/Legal Help hub, reminders/search shortcuts

22. **E7** Statutory & Criminal Context References
- Steps: MCL 750.81 summary + M Crim JI 13.1/13.2 reference panel

23. **E8** UI/Accessibility System
- Steps: legal-design UI kit, widget library, accessibility pass, dashboard specs

24. **E8** Research/Reference Audits (non-blocking)
- Steps: OpenContracts, OpenClaw, SSRN/AI research, AI usage policy references

25. **E2/E8** Lawma classifier for auto-tagging
- Steps: add document type classifier for police/medical/witness/video, map tags to modules, test against labeled examples

26. **E8** LegalBench AI quality testing
- Steps: run benchmark subset for legal reasoning, build model scorecard, tune prompts/guardrails

27. **E8** Legal Text Analytics resource scan
- Steps: review tool/dataset list, shortlist OCR/NER/citation extractors, note glossary/annotation tools

28. **E2/E8** LegalNexus RAG architecture reference
- Steps: review QA/hallucination checks, adopt case-workspace isolation patterns, evaluate retrieval routing

29. **E8** OLAW research framework reference
- Steps: review safety guardrails, retrieval experiments, and UI testing patterns for non-lawyers

30. **E8** Awesome LegalAI Resources scan
- Steps: review curated datasets/tools list, shortlist any US-relevant sources, avoid non-US legal data

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
