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
18. **E1** A-to-Z document pack builder
19. **E2** Exhibit Detail expansion
20. **E2** Video content analysis (VCAT-style)
21. **E2** Layout-aware document parsing (DeepDoc)
22. **E7** Statutory & Criminal Context References
23. **E8** UI/Accessibility System
24. **E2/E8** Lawma classifier for auto-tagging
25. **E8** Research/Benchmark consolidation (non-blocking)

## Backlog Items
0. **E0** Master Plan Preservation (Assault + Dual-Track + Glass Citadel)
- Store current plan as canonical backlog reference for phased implementation
- Includes: case flow hub, court-profile rules, pre-file audit, SCAO forms, narrative dossier,
  video forensics lab, security/IP safeguards, and dual-track wage/retaliation module

1. **E1** MiFILE reconnect completion status
- Steps: suppress banner after completion, show last completion date

2. **E1** Service method wizard
- Steps: branching steps for individual vs business vs government

3. **E2** Proof-of-service to Evidence Vault
- Steps: save uploaded proofs as exhibits, link to timeline

4. **E2** Proof preview
- Steps: PDF preview for proof uploads in Proof Review

5. **E1** Filing checklist PDF export
- Steps: export printable filing checklist PDF

6. **E1** Case-type eligibility library
- Steps: list eligible/blocked case types for Oakland County

7. **E1** Deadline holiday editor
- Steps: user-editable court holiday list

8. **E5** Timeline-to-trial notebook export
- Steps: export timeline + evidence links to text bundle

9. **E2/E5** Evidence-to-element mapper
- Steps: map evidence to assault/battery elements

10. **E5** Witness prep packets
- Steps: auto question list per witness

11. **E5** Objection drill mode
- Steps: quick quiz for objection timing

12. **E5** Self-defense counter planner
- Steps: list defense claims and rebuttal evidence

13. **E6** Medical bill totalizer
- Steps: sum from uploaded medical bills

14. **E6** Lost income tracker
- Steps: calendar day count + wage inputs

15. **E6** Business loss worksheet
- Steps: simple P&L inputs

16. **E6** Settlement demand PDF generator
- Steps: generate PDF demand letter

17. **E5** Trial exhibit order list
- Steps: drag-drop ordering with export

18. **E2/E5** Video sync to timeline
- Steps: link timestamp to timeline event

19. **E8** Audit export
- Steps: download audit log

20. **E8** Client-facing print pack
- Steps: clean PDF summary for court or mediator

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
