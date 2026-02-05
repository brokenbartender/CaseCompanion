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
1. **E1** Build Master Checklist view aligned to benchbook phases
- Steps: Phase list, required docs, status tracking, next-action button

2. **E1** Dashboard redesign to show Case Journey timeline
- Steps: visual phase timeline, highlights, upcoming deadlines

3. **E3** Discovery Wizard: Interrogatories
- Steps: template library, timing rules, send/export

4. **E3** Discovery Wizard: Requests for Production
- Steps: exhibit requests, video request, subpoena helper

5. **E3** Discovery Wizard: Requests for Admission
- Steps: admit/deny prompts, response deadlines

6. **E2** Evidence Vault tagging taxonomy
- Steps: Authority/Evidence/Damages, phase tags, filters

7. **E2** Exhibit Detail: transcript attachment + timeline binding
- Steps: upload transcript, map to timecodes

8. **E4** Summary Disposition Planner
- Steps: motion outline, element check, evidence links

9. **E4** Motion Builder (general)
- Steps: generate caption blocks, auto-cite exhibits

10. **E5** Voir Dire Designer UI
- Steps: bias checklists, question bank, print sheet

11. **E5** Objection Battle Cards + quick MRE citations
- Steps: filters by context, one-tap objection

12. **E5** Witness Exam Planner
- Steps: direct/cross scripts, impeachment links

13. **E6** Damages Calculator v2
- Steps: medical totals, collateral source notes, wage + business loss

14. **E6** Settlement Demand Generator
- Steps: pull damages, exhibit citations, export PDF

15. **E7** PII Guard + MC 97 workflow
- Steps: redact fields, generate protected info form checklist

16. **E7** Fee Waiver Wizard (MC 20)
- Steps: eligibility prompts, filing checklist

17. **E8** Legal-design UI kit
- Steps: readable typography, plain-language panels, iconography

18. **E8** Accessibility pass (color contrast, large targets, keyboard nav)
- Steps: audit + fixes
19. **E1/E8** Dashboard design spec from court dashboard guide
- Steps: KPI hierarchy, layout grid, chart types, accessibility + responsive standards
20. **E1/E8** Case management UI spec from Digital Lawyer Diary guide
- Steps: cases list, case detail, hearings/status, mobile navigation, PWA install flow
21. **E8** Dashboard widget library (Diary-style widgets)
- Steps: today/tomorrow, case status, upcoming hearings, evidence alerts
22. **E1** Case detail page redesign (Diary-style case file)
- Steps: tabs for timeline, evidence, tasks, hearings, motions, discovery
23. **E1/E7** Self-help resources hub (SCAO + Michigan Legal Help)
- Steps: curated links, county-specific resources, safety/privacy notices
24. **E1** MiFILE e-filing helper
- Steps: e-filing guide, fee payment/waiver prompts, PDF prep checklist
25. **E1/E7** Court reminders + case search shortcuts
- Steps: reminder setup links, court search links, privacy guidance
26. **E1/E7** Michigan court glossary integration (HOLT)
- Steps: in-app glossary, hover definitions, plain-language explanations
27. **E1/E7** HOLT glossary dataset + tooltip wiring
- Steps: extract glossary terms into JSON, add tooltip component, wire to checklist and timeline
28. **E1/E2** RAM evidence validator (Relevant, Authentic, Material)
- Steps: evidence intake checklist, RAM scoring, integrity warnings
29. **E1** Complaint drafting wizard (story + relief)
- Steps: numbered paragraphs, jurisdiction/venue, relief builder, export
30. **E1/E7** Service of process tracker + proof upload
- Steps: process server workflow, proof-of-service checklist, deadline reminders
31. **E3** Default judgment trigger
- Steps: answer deadline tracker, default motion checklist, filing reminders
32. **E3/E4** Mediation readiness module
- Steps: settlement position, damages summary, exhibit packet checklist
33. **E5** Narrative testimony coach
- Steps: self-question script builder, story flow guardrails, practice mode
34. **E5** Cross-exam leading question builder
- Steps: yes/no question templates, impeachment links
35. **E5** Objection helper (basic)
- Steps: hearsay/speculation/non-responsive prompts + examples
36. **E7** Victim safety & confidentiality workflow
- Steps: address confidentiality prompts, safety checklist, protective order prompts
37. **E6** Restitution + out-of-pocket expense tracker
- Steps: medical, wages, travel/parking, receipts upload
38. **E1/E7** Deadline risk monitor (service + filing)
- Steps: track 90-day service window, motion deadlines, alerts
39. **E1** Oakland County court selector (52nd District vs 6th Circuit)
- Steps: claim amount gate, division selector, venue guidance
40. **E1** MiFILE registration helper (Pro Se submitter)
- Steps: account flow, payment method checklist, fee waiver path
41. **E1** A-to-Z document pack builder (separate PDFs)
- Steps: summons MC 01, complaint MC 01a, fee waiver MC 20, file naming
42. **E1** MiFILE initiation wizard
- Steps: select court, initiate case, enter parties, upload filings, checkout
43. **E1/E7** Service gap checklist (90-day rule)
- Steps: who can serve, personal service requirements, timer + warnings
44. **E1** Proof of service upload flow
- Steps: MC 01 proof section, MiFILE filing type selector
45. **E2/E8** OpenContracts feature audit (inspiration, not reuse)
- Steps: compare doc ingestion, annotation, schema extraction, AI search; note AGPL license constraints

## Roadmap Tracker

Status legend: `planned` `in_progress` `done`

| Phase | Goal | Items | Status |
| --- | --- | --- | --- |
| Phase 1 | Core civil-case flow + evidence | E1, E2 | planned |
| Phase 2 | Discovery + motions | E3, E4 | planned |
| Phase 3 | Trial prep + damages + settlement | E5, E6 | planned |
| Phase 4 | Privacy + UX system + accessibility | E7, E8 | planned |

## Dependencies
- E1 depends on civil benchbook mapping completion.
- E2 depends on evidence ingestion + forensics pipeline stability.
- E3 depends on E1 core workflow and evidence tagging.
- E4 depends on E3 discovery timeline.
- E5 depends on E1/E2 for exhibits and evidence access.
- E6 depends on E2 evidence + E1 timeline + E5 trial framing.
- E7 depends on E1 intake flows.
- E8 depends on final IA for E1-E7.
