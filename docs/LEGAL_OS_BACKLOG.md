# LEGAL_OS_BACKLOG.md

Status: Master backlog (cumulative). Every feature/idea discussed is captured here.
Running total (current): 811 items.

## Execution Order (Optimized Phases)
Phase 1 - Foundations (Data Model + Security Baseline)
- Items: 406-407, 412, 416-417, 430-433, 452-453, 526-533, 540-545, 542-543, 464

Phase 2 - Audit, Chain of Custody, Export Core
- Items: 396-405, 398-399, 422-423, 450-451, 470-473, 554-555

Phase 3 - Privilege, Legal Hold, Access Controls
- Items: 410-415, 424-447, 468-469, 444-445, 556-557

Phase 4 - Redaction + Bates Pipeline
- Items: 394-395, 438-441, 500-501

Phase 5 - Ingestion & Media Processing Upgrades
- Items: 366-369, 382-385, 418-421, 458-463, 474-475

Phase 6 - LLM Grounding, Reliability, Legal Reasoning
- Items: 364-381, 386-393, 374-377, 388-389, 504-519

Phase 7 - Search & Retrieval Improvements
- Items: 376-379, 460-487, 516-517

Phase 8 - Case Operations & UX Workflows
- Items: 420-423, 465, 488-489, 496-497, 498-499, 502-503, 548-551

Phase 9 - Analytics, Translation, Comms
- Items: 476-479, 490-493, 520-525, 546-547, 552-553

Phase 10 - Integrations & External Products
- Items: 434, 436-437, 472, 480-483, 510-511, 560-563, 562-565

Tagging scheme for execution:
- Default tag: CORE
- Phase-Later / Optional items are explicitly listed at the end of this file.

## 1) Trust, Verification, Audit
1. [x] Verified/Pending/Revoked evidence state everywhere.
2. [x] Deterministic citation teleport from AI outputs to exact offsets.
3. [x] Teleport fallback to page with user-visible toast when bbox missing.
4. [ ] Refusal responses deep-link to the audit ledger entry.
5. [x] Hash verification + chain-of-custody visible in UI.
6. [x] Export packets include manifest + hashes.
7. [x] Immutable audit ledger entry for every critical action.
8. [x] Integrity badge always visible in matter context.
9. [x] Local hash mismatch alert for dragged files.
10. [ ] Verification cost signals on AI outputs (time to verify, % anchored).
11. [ ] Verification-first mode for high-risk outputs.
12. [x] Unified AI Output Integrity Panel (verification %, provenance, policy results, audit status).
13. [ ] Evidence Health Score per exhibit (integrity + OCR confidence + custody).
14. [x] Export-time digital signatures on evidence packets.
15. [x] Legal hold blocks export as well as deletion.
16. [x] Chain-of-custody affidavit export.

## 2) Research and Authority
10. [ ] Conversational legal search with citations.
11. [ ] Citation validity signals (good/warn/overruled).
12. [ ] 50-state survey backend + UI.
13. [ ] Jurisdiction comparison matrix.
14. [x] Legal Research Memo skill (Answer + authorities + quotes).
15. [x] Brief Analyzer for missing/contradicting authority.
16. [x] Search-a-Database skill (needle-in-haystack).
17. [ ] Market Check skill (trend analysis from contract corpuses).
18. [ ] Summarize skill with long-doc page-range summaries.
19. [ ] Review Documents skill with page-level citations.
20. [ ] Extract Contract Data skill with table outputs.
21. [ ] Contract Policy Compliance skill with redline suggestions.
22. [ ] Deposition Prep skill (topics + questions).
23. [ ] Context-aware answers blending playbooks, historical positions, and trusted sources.
24. [x] Agreement comparison against prior negotiated contracts (semantic diff across formats).
25. [ ] Editable Word reports/memos generated from AI outputs.
26. [x] Traceable reasoning trail for each response (links to clauses and sources).
27. [x] Room-scoped queries (project/deal/business-unit restricted analysis).
28. [x] Multi-agent research workflow (retrieve, validate citations, check conflicts, flag gaps).
29. [ ] Google Docs input support for AI review.
23. [ ] Statute hierarchy graph (code > title > chapter > section) with deep links.
24. [x] Definition extraction with inline glossary for statutes.
25. [ ] Answer template with TLDR + rules + exceptions/limits sections.
26. [x] Multi-embedding per statute (text, definitions, title path) for stronger retrieval.
27. [x] Source-text pane showing exact statutory language alongside answers.
28. [x] Argument mining from case text (premises/conclusions + support/attack links).
29. [ ] Argument-role search (query for rule application, evidence, conclusion roles).
30. [ ] Conceptual IR reranking using argument-role matches.
31. [ ] Legal hypothesis testing workflow (supporting + conflicting authorities).
32. [ ] Legal type system for annotations (sentence roles, rule types, factors).
33. [ ] Case-based prediction with explanation chain (reasoned similarity).
34. [x] Statutory normalization flowchart output (paths to conclusion).
35. [ ] Isomorphic rule-text mapping enforcement for explainability.

## 3) Evidence and Document Review
23. [ ] Split view: AI/citations left, document viewer right.
24. [x] OCR extraction pipeline with metadata (dates, amounts, entities).
25. [ ] Redactions with burn-in export.
26. [x] Bates stamping with sequential IDs.
27. [x] Privilege detection and tagging.
28. [x] Privilege log CSV export.
29. [x] Review queues with status filters.
30. [ ] QC workflows and escalation flags.
31. [ ] Bulk actions on selected documents.
32. [ ] Batch analysis queue for large sets.
33. [ ] Document Center: metadata-only before purchase/authorization.
34. [x] Download all files as ZIP.
35. [ ] Version history + restore + soft delete.
36. [ ] Structural annotation extraction (headers/paragraphs/tables).
37. [ ] Multi-page annotations + label schemas + validation.
38. [ ] Relationship mapping between annotations.
39. [ ] Annotation import/export in standard formats.
40. [ ] Pluggable parsing pipeline (multiple backends).
41. [x] Semantic embeddings for similarity search.
42. [ ] Data extraction schemas -> grid review -> export.
43. [ ] OCR full-text search for all imports.
44. [ ] PDF preprocessing pipeline with x,y text coordinates for every token.
45. [ ] Standardized OCR output schema for ML/analytics consistency.
46. [ ] Tesseract-based OCR preprocessor with pdf2image pipeline.
47. [ ] PAWLs-compatible annotation extraction for PDF text layers.
48. [ ] Page-level annotation scaling logic validated by tests.
49. [ ] Pluggable preprocessors for alternative PDF engines.
50. [ ] Heterogeneous data source support (Word, slides, spreadsheets, images, web pages). citeturn0view0
51. [ ] Cross-language query support for multilingual search. citeturn0view0
52. [ ] Orchestrable ingestion pipeline (configurable stages). citeturn0view0
50. [ ] End-to-end Discovery Workflow UI (ingest -> OCR -> review -> privilege -> redaction -> QC -> production).
51. [ ] Compliance trace reporting (rules + tasks causing violations).
52. [ ] Review manager role (distinct from paralegal).
53. [ ] QC sampling modes (percentage + rule-based).
54. [ ] Auto-reopen review items on QC failure.
55. [ ] Issue coding panel in document viewer.
56. [ ] Issue library with claims/elements/statutes mapping.
57. [ ] Evidence re-processing with version history (OCR reruns).
58. [x] Transcript + video sync viewer for deposition/media evidence.

## 4) Discovery and Production
44. [ ] Production Center packaging + export.
45. [ ] Privilege review workflow.
46. [ ] Production QC module.
47. [ ] Production sets UI with Bates ranges.
48. [ ] Predictive coding/TAR review flow.
49. [ ] Sentiment analysis in review.
50. [ ] Discovery analytics and visualizations.

## 5) Drafting, CLM, and Clause Libraries
51. [ ] Clause insertion (indemnity, venue, force majeure).
52. [ ] Playbook enforcement warnings.
53. [ ] Redline compare view.
54. [ ] Plugin mode sidebar (Word/Outlook-like).
55. [ ] Draft version history + restore.
56. [ ] AI Assist in-editor redlines on highlighted text.
57. [ ] Natural-language instructions for batch revisions.
58. [x] Summarize committed text only (exclude uncommitted redlines).
59. [ ] Apply all playbook redlines or resolve individually.
60. [ ] Track-changes aware editing vs suggestion.
61. [ ] Admin enablement + per-group permissions for AI Assist.
62. [ ] AI Playbooks with required/restricted/non-standard rules.
63. [ ] Playbook rule sequence (preferred match -> type detect -> triggers).
64. [ ] AI data detection of 175+ clauses.
65. [ ] Contract type detection (NDAs, DPAs, order forms, etc.).
66. [ ] Custom AI properties and clauses training.
67. [x] Document automation templates.
68. [ ] Advanced doc automation (HotDocs-style).
69. [ ] Word ribbon plugin (open/save/version in matter).
70. [ ] In-browser DOCX editing.
71. [ ] Merge files into PDF portfolio.
72. [ ] File locking for edits.
73. [ ] Auto-save new versions during edits.
74. [ ] E-signatures workflow.
75. [ ] NetDocuments integration.
76. [ ] Clause risk scoring and rationale display.
77. [ ] Playbook exceptions workflow with approval + audit.
78. [ ] Jurisdiction-specific playbooks and clause variants.

## 6) Agentic and AI Workflow Platform
76. [ ] Planner -> steps -> execution flow.
77. [ ] Verifier modal with confidence.
78. [ ] Rollback history.
79. [ ] Agent action audit trail.
80. [ ] Configurable AI agents with tool access + conversation history.
81. [ ] Skills menu with categories + recent skills.
82. [x] Skill launcher dialogs with required inputs.
83. [ ] Skill progress bar with ETA.
84. [ ] Streaming results in-place.
85. [ ] Reuse uploads across skills.
86. [ ] Rerun prior queries from dropdown history.
87. [ ] Save AI outputs to matter folders.
88. [ ] Skill outputs as tables/grids with hover explanations.
89. [ ] Export options: Word, Excel, Redlined, Copy.
90. [ ] Short-answers vs explanations toggle.
91. [ ] Safety mode toggle for guardrails.
92. [ ] Skills Workbench run history index (filterable by matter/skill/time/output).
93. [ ] Tool-suggestion confirmation step before launching external searches.
94. [ ] Search-statement extraction API (convert user intent into structured queries).
95. [ ] Modular tool router (search, read, summarize, extract) with pluggable tools.
96. [ ] Multi-provider LLM selection per workflow (OpenAI/Ollama/other).
97. [ ] Tool prompt/config profiles per skill (stored and reusable).
93. [ ] Visual workflow canvas for AI workflows (node-based).
94. [ ] Prompt IDE with side-by-side model comparison.
95. [ ] Model provider management (multiple LLM backends selectable per workflow).
96. [ ] LLMOps observability (logs, metrics, prompt/dataset feedback loops).
97. [ ] Built-in tool library for agents (search, vision, calc, etc).
98. [ ] RAG pipeline builder with multi-format ingestion (PDF/PPT/DOC).
99. [ ] Backend-as-a-service APIs for embedding AI apps into product.
100. [ ] Legal QA vs Legal Reasoning mode separation (distinct pipelines + labels).
101. [ ] Defeasible rule engine (non-monotonic logic support).
102. [ ] Skill progress bar with ETA.
103. [ ] Streaming results with partial output.
104. [ ] Save AI outputs into matter folders.
105. [ ] Rerun prior queries from dropdown history.

## 7) Client Intake, Portal, and Management
92. [x] Invite client workflow (name/phone/email/expected completion date).
93. [x] Status lifecycle (Unconfirmed, In Progress, Ready, Downloaded, Deleted, Inactive).
94. [x] Status-based action buttons (resend, preview, resubmit, purchase, export).
95. [x] Questionnaire review loop with Needs Review notes.
96. [x] Client activity timeline with auto-logged events.
97. [x] Email client tab with BCC and audit logging.
98. [x] Client portal with secure doc/billing sharing.
99. [x] Review/approve client uploads into matter.
100. [x] Large file uploads.
101. [ ] White-label portal branding.
102. [ ] Native portal mobile apps.
103. [x] Client progress % and section status.
104. [x] Client impersonation/login-as-client.
105. [x] Purchase/download client file flow.
106. [x] Export client file flow.
107. [x] Account management: firm info, users, preferences, billing, invoices.
108. [x] Questionnaire hints + default instructions.
109. [ ] Client portal secure messaging.
110. [ ] Client portal shows document review status.
111. [ ] Client portal shows task assignments.
112. [ ] Client portal shows billing history.
109. [ ] Intake/chatbot automation.
110. [ ] CRM lead pipeline and intake forms.
111. [ ] Convert lead to matter.
112. [ ] Intake tasks + notes + email tracking.
113. [x] Two-way SMS messaging with clients.
194. [ ] AI-driven form identification + autofill for intake packets.
195. [ ] Multilingual intake and document translation support (client-facing).
196. [ ] Client Completion SLA dashboard (expected completion dates + reminders).
197. [ ] Auto-generate guided interview from labeled PDF/DOCX (intake form autodrafter). 
198. [ ] Auto field-grouping for form questions (smart sectioning).
199. [ ] Rapid prototyping for court forms with runnable draft interview.

## 8) Practice Operations
114. [ ] Time & billing with LEDES export.
115. [ ] Docket & deadlines.
116. [ ] Conflict checks.
117. [ ] Engagement workflow.
118. [ ] Task & approvals.
119. [ ] Client exchange.
120. [x] Calendar management (rules, reminders, ICS, Zoom links).
121. [x] Task management with templates/subtasks/recurring.
122. [x] Contact management with roles, tags, CSV import/export.
123. [ ] Business card scan -> contact.
124. [ ] Auto time entries from emails.
125. [ ] Auto time entries from calendar events.
126. [ ] Email-to-task conversion.
127. [ ] Save emails to matter without forwarding.
128. [ ] Secure email options (encryption, proof of delivery, e-sign).
129. [ ] Smart matter association for inbound email.
130. [ ] Docket rules auto-calc (weekends/holidays + rule updates).
131. [ ] Calendar event privacy status (Available/Busy/OOO).
132. [ ] Calendar ICS invite export.
133. [ ] Zoom link generation for events.
134. [ ] Trust accounting reconciliation reports.
135. [ ] Invoice bulk send + late fee rules + installment plans.
136. [ ] Billing pre-review workflow.
137. [ ] Conflict check auto-screen from intake.
138. [ ] CRM lead pipeline dashboard with referral analytics.
139. [ ] Mobile offline access for key case files.
140. [ ] PWA push notifications for deadlines.
196. [ ] AI workflow prioritization (auto-rank tasks/events by urgency/value).
197. [ ] Demand letter generator from case facts + precedent.
198. [ ] Lead-source analytics and referral attribution dashboard.
199. [ ] Sidebar AI assistant embedded in practice management views.
130. [ ] Multi-channel client comms connectors (Slack/Teams/WhatsApp/Telegram/Signal) for matter-linked messaging.
131. [ ] Inbound DM pairing/allowlist approval for secure external communications.
132. [ ] Cross-channel Activity Timeline (emails, SMS, tasks, audits, uploads).
133. [ ] Corporate entity management (companies, shares, board members, assets).
134. [ ] IP case management with renewal tracking and country-specific reminders.
135. [ ] Litigation hearing lifecycle with effort estimation and reminders.
136. [ ] Universal search across contacts, matters, tasks, documents, reminders.
137. [ ] Mobile money/payment integrations for invoices (regional rails).
138. [ ] Appointment management with RSVP (accept/decline) + reminders.
139. [ ] Case assignment workflow that allocates lawyers and paralegals at creation.

## 9) Admin, Governance, and Security
132. [ ] Policy editor and policy-as-code.
133. [ ] Legal hold manager.
134. [ ] RBAC editor and permissions matrix.
135. [ ] Notifications center.
136. [ ] SIEM export.
137. [ ] User groups and admin BI dashboard metrics.
138. [ ] Matter-level permissions and role assignments.
139. [ ] Data encryption at rest/in transit.
140. [ ] Do-not-train AI data isolation policy.
141. [ ] Human-in-the-loop verification prompts.
142. [ ] 2FA for portal and app.
143. [ ] Compliance signals (SOC/ISO/PCI) surfaced.
144. [x] Human sign-off gate required before litigation-grade exports.
145. [x] Policy enforcement transparency panel (“why flagged”).
146. [ ] Model provenance banner on outputs (model ID, policy version, retrieval source).
147. [ ] AI regulatory mapping matrix (AI Act readiness, oversight flags).
148. [ ] Integration hub for e-sign, CLM, DMS, CRM, and cloud storage providers.

## 10) Billing, Accounting, and Reporting
144. [ ] Pre-bill workflow and approvals.
145. [ ] Split billing + consolidated billing.
146. [ ] Trust accounting and three-way reconciliation.
147. [ ] Vendor bills/credits/AP.
148. [ ] Bank feeds and reconciliation.
149. [ ] Settlement allocations + memos.
150. [ ] Advanced reporting suite (AR aging, P&L, GL, productivity, trust).
151. [ ] Invoice customization, discounts, late interest, bulk billing.
152. [ ] LEDES invoice formats and UTBMS codes.

## 11) Mobile and UX Pattern Library
153. [ ] Mobile sidebar hamburger + responsive layout.
154. [ ] Table horizontal scroll + touch-friendly controls.
155. [ ] Native iOS/Android apps with biometric login.
156. [ ] Document scanning with edge detection + OCR.
157. [ ] AppShell with header + sidebar.
158. [ ] PageHeader with breadcrumbs + actions.
159. [ ] SplitPane resizable layout.
160. [ ] SourcesPanel for citations.
161. [ ] ActivityFeed timeline component.
162. [ ] Citation/Source cards.
163. [ ] TaskCard/ResearchCard patterns.
164. [ ] ThinkingBlock/TypingIndicator for AI progress.
165. [ ] FilterTabs with counts.
166. [ ] ActionList for quick actions.
167. [ ] StatGrid/StatBlock for KPIs.
168. [ ] Toast/Alert/Banner/Progress/Skeleton system.
169. [ ] ProjectPicker for matter selection.

## 12) Strategy, Adoption, and Ethics
170. [ ] AI adoption strategy framework (practice area, size, volume, client expectations, budget).
171. [ ] Vendor evaluation checklist (experience, reviews, support, contracts, pilots).
172. [ ] Pricing models support (subscription, usage-based, enterprise, freemium).
173. [ ] Ethics guardrails (bias, citation verification, confidentiality, accountability).
174. [ ] Professional responsibility banner (AI is assistive, not a substitute).
175. [ ] In-app help center + guided tutorials + learning hub for legal tech workflows.

## 13) Reliable Legal AI Architecture (research-driven)
186. [ ] Knowledge-Graph-enhanced RAG for legal retrieval and context grounding.
187. [ ] Mixture-of-Experts (MoE) routing by legal task domain.
188. [ ] RLHF feedback loop for legal accuracy and hallucination reduction.
189. [ ] Role-aligned expert modules (consultant/researcher/paralegal/advisor) with task-specific prompts.
190. [ ] Retrieval similarity threshold tuning (high-precision defaults for legal text).
191. [ ] Multi-stage pipeline: embed -> retrieve -> KG-enrich -> generate.
192. [ ] Benchmark harness across legal datasets with task-specific metrics (accuracy/Rouge/F1/BLEU).
193. [ ] Structured operational guidelines that mirror legal workflows to reduce error compounding.
194. [ ] Evaluation suite integration for LegalBench/LexGLUE/LEXTREME-style legal benchmarks.
195. [ ] Multilingual legal corpus ingestion for RAG (multi-jurisdiction corpora).
196. [ ] CourtListener ingestion for U.S. opinions as a grounded authority source.
197. [ ] Legal case-retrieval benchmarks integration (COLIEE/LeCaRD) for retrieval quality.
198. [ ] Domain-adaptive pretraining for jurisdiction-specific legal corpora.
199. [ ] Task-specific legal NLP pipelines (NER, citation extraction, statute linking).
200. [ ] Dataset provenance registry for training/evaluation data lineage.
201. [ ] Structured legal grammar layer to reduce ambiguity in legal reasoning.
202. [ ] Rule-based truth evaluation engine for legal statements.
203. [ ] Legal-domain class/function library for repeatable reasoning (contract/tort/criminal).
204. [ ] Regulation scraping pipeline with per-source parsers.
205. [ ] Passage-overlap chunking to preserve context.
206. [ ] Separate metadata store + vector index for retrieval scale.
207. [ ] Similarity-threshold + reranking stage before generation.
208. [ ] Reconstruct full article context from top passages for review.
209. [ ] Public vs test app modes with tunable retrieval/LLM settings.
210. [ ] Example query library to guide legal prompting.
211. [ ] MoE-optimized inference path (router-aware serving).
212. [ ] FP8/quantized inference profiles for cost-efficient serving.
213. [ ] Multi-token prediction / speculative decoding for faster responses.
214. [ ] Long-context readiness testing for very large legal corpora.
215. [ ] Multi-lingual evaluation harness for non-English legal tasks.
216. [ ] Tool-use optimization for large MoE models (routing to function-calling mode).
217. [ ] Safety/rule gating for high-risk jurisdictions (per-policy model routing).
218. [ ] Model capability registry (context length, tool-use, coding, reasoning flags).
219. [ ] Large-scale legal corpus ingestion (Pile-of-Law style) with source segmentation.
220. [ ] License-aware data filtering and audit logs for training/eval datasets.

## 14) Codex Project-Inspired Additions
221. [ ] Human-in-the-loop validation queue for AI answers before client-facing release.
222. [ ] Early risk detection from client communications (SMS/text signals).
223. [ ] FRC drafting guidance (Fact-Rule-Conclusion structure assistance).
224. [ ] Peer-reviewed knowledge hub for vetted legal answers.
225. [ ] AI-assisted form redesign for clarity and accessibility (visual reformatting).

## Phase-Later / Optional (explicit list)
These items are useful but not required to reach core “legal OS” functionality.
- 38. Relationship mapping between annotations.
- 39. Annotation import/export in standard formats.
- 40. Pluggable parsing pipeline (multiple backends).
- 41. Semantic embeddings for similarity search (if search is already strong).
- 49. Pluggable preprocessors for alternative PDF engines.
- 69. Word ribbon plugin (open/save/version in matter).
- 70. In-browser DOCX editing.
- 71. Merge files into PDF portfolio.
- 72. File locking for edits.
- 73. Auto-save new versions during edits.
- 74. E-signatures workflow.
- 102. Native portal mobile apps.
- 155. Full native iOS/Android apps (beyond portal).
- 170. AI adoption strategy framework (business ops).
- 171. Vendor evaluation checklist (business ops).
- 172. Pricing models support (business ops).



## 13) Source-Driven Additions (MyCaseInfo/CARET/CoCounsel/Ironclad/AI Tools)

277. [ ] Client invite workflow with expected completion date, section selection, instructions, and send options (portal onboarding).
278. [ ] Client status categories with color-coded progress (active/in-progress/ready/downloaded/deleted/unconfirmed/inactive).
279. [ ] Client progress % by section + per-section status (not started/in progress/completed).
280. [ ] Status-based action buttons: preview, resend, resubmit, view PDF, client login, remove invite, purchase, export.
281. [ ] Client list controls: search by name/status, open-flag filter, sort by name/status, customizable columns.
282. [x] Flagged questions workflow with attorney responses and reopen/close lifecycle.
283. [x] Needs-Review notes on questionnaire items with resubmit-to-client loop and completion tracking.
284. [ ] Document Center with client uploads, metadata view, and bulk ZIP download.
285. [ ] Activity log with auto events (invite, confirm, submit, resubmit, email, status change, purchase, download).
286. [ ] Inline email-to-client tool with optional BCC and templated instructions.
287. [ ] Account management: firm info, user accounts, preferences, billing, invoices.
288. [ ] Questionnaire hints + default certification language + chapter-specific instructions templates.
289. [ ] Client file purchase/download/export workflow with import-ready package format.
290. [ ] Customizable matter dashboards (shareable views/"Matterscapes").
291. [ ] Matter-level permissions with user groups and role assignments (billing/originating/responsible).
292. [x] Custom fields by practice area for merge fields and automation.
293. [ ] Default folder templates per practice area (documents/notes).
294. [ ] Admin BI dashboard for firm metrics (matter, billing, activity).
295. [x] Two-way SMS messaging with clients/leads/contacts.
296. [ ] Email integration: auto-time capture, smart contact detection, save-to-matter, convert to task.
297. [ ] Secure email with proof of delivery + e-sign options.
298. [ ] Client portal with secure document sharing, large uploads, white-label branding, mobile apps.
299. [x] Contact management: custom fields, role color codes, business-card scan, tags, import/export.
300. [ ] Calendar rules engine (deadline calc, holidays/weekends), reminders, shared calendars, Zoom links, ICS invites.
301. [ ] Task management with templates, subtasks, reminders, priorities, categories, attachments, recurring, status filters.
302. [x] Document management: versioning, comments/tags, in-doc search, preview, docx in-browser edit, PDF merge.
303. [ ] Word plugin + drive sync workflow for document save/versioning.
304. [ ] OCR capture from scans + auto-classification; file lock/checkout for edits.
305. [x] Document automation with templates + advanced form logic (HotDocs-style).
306. [ ] CRM/Intake pipeline with leads, web intake forms, conversion to matter, tasks/notes/emails.
307. [x] Billing & accounting suite (unbilled filters, AP, reconciliation, check printing, pre-bill review, reports).
308. [ ] Time & expense tracking (multi-timers, auto-capture from email/phone, rate cards, LEDES).
309. [ ] Trust/retainer management with ledgers and low-balance alerts.
310. [ ] Advanced reporting pack (AR aging, productivity, WIP, trust, billing, compensation).
311. [ ] Security hardening: 2FA, encryption, compliance standards visibility.
312. [x] Skill launcher UI with progress bar, streaming results, and ETA feedback.
313. [ ] Reuse documents and prior queries within matter folders (skill history).
314. [ ] Skill output formats: memo w/ sources, table w/ hover citations, export Word/Excel/redlines.
315. [ ] Chat recommends best-fit skill; question interpretation confirmation before run.
316. [ ] AllSearch-style database indexing for large document corpora.
317. [ ] Legal Research Memo: multi-search across primary law with answer + authorities + quotes.
318. [ ] Review Documents skill: line-by-line answers with page citations.
319. [ ] Extract Contract Data skill: multi-question tables with answer-type selection.
320. [ ] Contract Policy Compliance: policy input, sample clauses, redline output.
321. [ ] Deposition Prep skill: topic + question generation workflow.
322. [ ] Summarize skill: multi-file, page-range summaries with deep links.
323. [ ] Safety mode toggle for guardrails vs creative outputs.
324. [ ] AI Assist: highlight paragraphs + natural-language redline instructions (tracked changes aware).
325. [ ] Playbook integration: apply all suggested redlines or resolve individually.
326. [ ] Admin enablement + user-group permissions for AI Assist.
327. [x] Smart Import: batch ingestion with OCR + AI metadata suggestions and verification queue.
328. [ ] AI Playbooks: required/restricted/non-standard clause detection with stakeholder routing.
329. [ ] AI extraction: standard properties + clause library, plus custom properties/clauses.
330. [ ] AI governance: do-not-train commitments + human-in-the-loop accept/reject.
331. [ ] AI ethics guardrails: accuracy verification, bias monitoring, confidentiality, accountability.
332. [ ] AI adoption criteria checklist (practice fit, firm size, volume, client expectations, budget).
333. [ ] Platform evaluation rubric (security, scalability, UX, support, contract terms, trial plan).
334. [ ] Pricing model planner (subscription/usage/enterprise/freemium) for ROI.
335. [ ] Document preprocessing pipeline for OCR cleanup, layout normalization, and metadata extraction.
336. [ ] Guided interview / form assembly (docassemble-style) for intake and filings.
337. [ ] RAG workflow builder (RAGFlow/Dify-style) to configure retrieval, tools, and evaluation.
338. [ ] Legal benchmark/eval suites (LegalBench, Pile of Law) for model scoring and regression.
339. [ ] Optional offline/alt LLMs for evaluation (HF-hosted models) with licensing checks.



## 14) Legal Reasoning Systems (Conceptual IR, Rules, Norm Graphs)

340. [x] Conceptual legal search + argument retrieval (proposition/authority/issue-role metadata) for concept-shaped queries.
341. [x] Argument Cards as first-class objects: claim, supporting excerpts, authority metadata, source links, fact-match notes.
342. [ ] Output-type labeling per AI response: retrieval-based vs reasoned vs speculative.
343. [x] Integrity panel basis field: sources used, model used, assumptions made.
344. [x] Statute normalization view: atomic propositions + indented logical structure + flowchartable paths.
345. [x] Ambiguity explorer: show alternative readings and record chosen interpretation with audit trail.
346. [ ] Statute-to-executable rules layer with text-isomorphic mapping + explainable outputs.
347. [x] Rule-pack format: rule id, predicates, source citations, versions/effective dates, explanation templates.
348. [x] Defeasible rules + exception priority handling for conflicts.
349. [x] Temporal obligations: must-hold, must-occur-within-window, satisfiable-early, curable violations.
350. [ ] Business process compliance workspace: workflow model with rule annotations + violation reports.
351. [ ] Compliance trace report: map violations to traces, rules, and tasks with remediation suggestions.
352. [x] Norm graphs (requirements graphs) with subsumption: conclusions -> subconditions -> required info fields.
353. [x] Norm graph builder: nodes (concept/question/condition/exception) + edges (depends/defines/requires).
354. [x] Statutory network diagrams for 50-state comparisons (actors, duties, communications).
355. [ ] Network-based 50-state compare: show gaps + missing relationships beyond tables.
356. [x] Case-based reasoning engine with factors/dimensions as first-class objects.
357. [ ] Factor library with rationales, hierarchy, and case tagging UI.
358. [ ] Similarity search by factors (analogous pro-plaintiff/defendant, counterexamples).
359. [x] Automated 3-ply argument builder (analogize -> distinguish -> rebut) with citations.
360. [ ] Argument drafting assistant that proposes cases/factors and generates structured argument blocks.
361. [x] Knowledge acquisition tooling for rules/factors/norm graphs with QC and versioning.
362. [x] Reasoning asset review queue (rules/factors/graphs) with PR-style review and tests.
363. [ ] Values/purposes layer (teleological tags) linked to rules/factors/exceptions for explanation support.

## 2026-02-04 Reliability, Compliance, and Business Fixes (User-Provided)
364. [ ] Add LLM negative constraint to return NO_RECORD_FOUND when answer not in context.
365. [ ] Render Evidence Missing UI when NO_RECORD_FOUND token detected.
366. [ ] Classify opinion segments as majority/concurring/dissenting during ingestion.
367. [ ] Store judicial_stance metadata for embeddings to filter dissent by default.
368. [ ] Add Shepard/KeyCite nightly job to validate cited statutes against live database.
369. [ ] Show red-flag overlay in viewer for negative treatment results.
370. [ ] Verify citation bbox within page bounds during generation.
371. [ ] Disable citation link when page mapping confidence <95%.
372. [ ] Run adversarial contradiction agent across uploaded documents.
373. [ ] Add Conflict Detected dashboard widget listing contradictions.
374. [ ] Enable logprobs and refuse answers below confidence threshold.
375. [ ] Add Strict Scrutiny toggle passing high-confidence parameter to backend.
376. [ ] Create jurisdiction hierarchy map for authority ranking.
377. [ ] Boost retrieval scores for matter jurisdiction authority.
378. [ ] Store clause chunk character offsets in vector store.
379. [ ] Highlight exact clause text in PDF when summary clicked.
380. [ ] Require reasoning field output for case relevance.
381. [ ] Add "Why this case?" accordion in search result cards.
382. [ ] Validate citations on upload via Lexis/Westlaw existence check.
383. [ ] Add verification_status metadata to documents.
384. [ ] Ingest KeyCite/Bad Law signals during extraction.
385. [ ] Mark bad law docs with red icon in file explorer.
386. [ ] Run critic model STS against paraphrases.
387. [ ] Force original quotes if STS score <0.85.
388. [ ] Add grounded vs general chat routes.
389. [ ] Add Closed/Open Universe toggle with distinct UI state.
390. [ ] Extract citations via regex from briefs.
391. [ ] Add Validate Citations button in drafting toolbar.
392. [ ] Prompt for jurisdiction when missing.
393. [ ] Persist current_jurisdiction in session.
394. [ ] Use destructive redaction (remove text objects) in PDFs.
395. [ ] Save redacted files as new versions.
396. [x] Compute and store original SHA-256 hash at ingest.
397. [x] Verify export hash against original before download.
398. [x] Add audit log entries for document views.
399. [x] Emit view audit event from document content API.
400. [x] Use CSS transform for rotation by default.
401. [x] Force Save As New Version for permanent rotation.
402. [x] Preserve EXIF metadata during image processing.
403. [x] Add CI test ensuring EXIF/GPS preserved after upload/download.
404. [x] Generate 902(14) audit certificate from logs.
405. [x] Bundle audit certificate into legal export zip.
406. [x] Add deleted_at soft-delete columns.
407. [x] Filter queries by deleted_at is null.
408. [ ] Store relative path on recursive ingest.
409. [ ] Reconstruct folder tree in export zip.
410. [x] Enforce legal hold middleware before delete/update.
411. [x] Block mutation with 403 when hold active.
412. [x] Create work_products table linked to chain-of-custody.
413. [x] Save AI summaries as hashed PDF work products.
414. [x] Skip privileged docs during Bates stamping loop.
415. [x] Add placeholder page for withheld docs during Bates export.
416. [x] Persist original file timestamps metadata.
417. [x] Apply original timestamps on native export.
418. [ ] Transcode proprietary video to MP4 proxy for viewing.
419. [ ] Keep original proprietary video in cold storage for native download.
420. [ ] Store annotations as separate JSON layer.
421. [ ] Render annotations as overlay elements on PDF canvas.
422. [x] Add audit report query per document views.
423. [x] Add "Who viewed this?" UI report for a document.
424. [x] Filter privileged docs from vector search by default.
425. [x] Update vector metadata immediately when privileged tag added.
426. [x] Run privilege classifier on ingestion.
427. [x] Auto-tag potential privilege and blur preview pending review.
428. [x] Implement clawback to purge caches and indexes.
429. [x] Clawback flow: mark privileged + delete vectors + invalidate CDN.
430. [x] Add allowed_user_ids or ethical wall constraints on matters.
431. [x] Enforce ethical wall membership in authScope.
432. [x] Add dedicated CLIENT role in RBAC.
433. [x] Restrict client API lists to PUBLIC document type.
434. [x] Switch to zero-data-retention LLM endpoints.
435. [x] Set opt_out_training flag in AI provider config.
436. [x] Proxy public legal search through backend.
437. [x] Strip user identifiers from external search requests.
438. [x] Add bulk find-and-redact UI.
439. [x] Process bulk redactions via background job queue.
440. [x] Ensure embeddings generated from redacted PDFs only.
441. [x] Block AI from using original text after redaction.
442. [x] Implement privilege log state machine with partner approval.
443. [x] Gate privilege log export on Approved status.
444. [x] Hide download actions for view-only users.
445. [x] Block download API for view-only role.
446. [x] Add privilege_type enum for ACP/WPD/etc.
447. [x] Allow export filtering by privilege_type.
448. [ ] Add admin offboarding wizard for ownership transfer.
449. [ ] Bulk reassign ownership on user exit.
450. [x] Log full AI request payloads to llm_audit table.
451. [x] Encrypt llm_audit storage at rest.
452. [x] Clear local/session storage and caches on logout.
453. [x] Blacklist JWT on logout in Redis.
454. [ ] Return sentence/snippet indices with AI summaries.
455. [ ] Highlight source sentences in viewer on hover.
456. [ ] Store timestamps in UTC.
457. [ ] Convert to local time at render only.
458. [ ] Run deepfake detection on media ingest.
459. [ ] Display authenticity score for video exhibits.
460. [ ] Implement fuzzy search with pg_trgm or ES.
461. [ ] Show "Did you mean" prompt for near matches.
462. [ ] Add handwriting OCR via Textract/Read API.
463. [ ] Trigger handwriting OCR based on document classification.
464. [x] Enforce document_versions table (append-only).
465. [ ] Add version history dropdown in viewer.
466. [ ] Build transcript editor synced to audio.
467. [ ] Save transcript corrections as new version.
468. [x] Generate privilege log from tagged docs.
469. [x] Export privilege log as Excel/PDF.
470. [x] Validate file magic numbers on upload.
471. [x] Run malware scan on upload buffer.
472. [x] Add on-demand conversion to docx/pdf/txt.
473. [x] Export PDFs in PDF/A-1b standard.
474. [ ] Integrate PST parser for email ingestion.
475. [ ] Explode PST into emails/attachments with relationships.
476. [ ] Run NER to build cast of characters.
477. [ ] Add People tab with role mapping.
478. [ ] Extract date-event-citation tuples for timeline.
479. [ ] Render interactive timeline from extracted tuples.
480. [ ] Build Word add-in for insert-from-LexiPro.
481. [ ] Add Insert from LexiPro button in Word.
482. [ ] Parse citations in Word draft.
483. [ ] Auto-link citations to sources.
484. [ ] Implement hybrid search slider (vector vs keyword).
485. [ ] Add "Search like this" using selected paragraph embedding.
486. [ ] Cluster documents for related suggestions.
487. [ ] Show "More like this" in viewer sidebar.
488. [ ] Tag docs by witness for binder.
489. [ ] One-click deposition binder generator.
490. [ ] Trigger conflict check on new contact entry.
491. [ ] Show real-time conflict badge in intake.
492. [ ] Integrate translation API (DeepL/Google).
493. [ ] Split view original vs translated with synced scroll.
494. [ ] Detect duplicates using SHA-256.
495. [ ] Hide duplicates and link to master document.
496. [ ] Enable tagging shortcuts in review UI.
497. [ ] Save tags optimistically with background sync.
498. [ ] Implement docket rules engine for deadlines.
499. [ ] Render docket dates in calendar widget.
500. [x] Overlay Bates numbers on batch PDFs.
501. [x] Merge Bates-stamped batch for printing.
502. [ ] Add archive/read-only status for closed matters.
503. [ ] Move archived files to cold storage tier.
504. [ ] Set neutral judicial-clerk system prompt.
505. [ ] Add bias benchmark tests for neutrality.
506. [ ] Generate counter-argument automatically.
507. [ ] Display argument vs counter-argument view.
508. [ ] Show bias disclaimer for JurorPredictor.
509. [ ] Exclude protected classes from prediction features.
510. [ ] Import judge analytics or allow judge-opinion upload.
511. [ ] Create judge-specific RAG context.
512. [ ] Detect loaded language in drafts.
513. [ ] Underline subjective language with tooltip.
514. [ ] Compare testimony versions for contradictions.
515. [ ] Highlight divergence across testimony versions.
516. [ ] Apply time-decay ranking to case law search.
517. [ ] Add sort by date option in citations list.
518. [ ] Require majority/minority view output.
519. [ ] Structure output into pros/cons/conclusion.
520. [ ] Run sentiment analysis on emails.
521. [ ] Filter communications by sentiment.
522. [ ] Create local rules formatting templates.
523. [ ] Apply court formatting on brief export.
524. [ ] Store settlement comps in structured table.
525. [ ] Retrieve comps for settlement estimates.
526. [x] Enable DB transparent data encryption.
527. [x] Encrypt sensitive columns (pgcrypto).
528. [x] Cache cases/docs for offline mode in PWA.
529. [x] Support offline edits with sync on reconnect.
530. [x] Implement MFA with Auth provider.
531. [x] Enforce org-level MFA requirement setting.
532. [x] Add IP whitelist middleware.
533. [x] Add admin UI for IP ranges.
534. [x] Delete vectors on matter deletion.
535. [x] Add vector DB cleanup hook on delete.
536. [ ] Quarantine uploads before malware scan.
537. [ ] Run ClamAV scan before moving to clean storage.
538. [ ] Ensure docker-compose or k8s for on-prem.
539. [ ] Abstract storage to allow MinIO/local.
540. [x] Track failed login attempts.
541. [x] Lock account and notify admin on brute-force.
542. [x] Use env vars for LLM keys.
543. [x] Inject keys via secrets manager in prod.
544. [x] Add SAML/OIDC SSO support.
545. [x] Allow IdP metadata upload in admin.
546. [ ] Generate one-click client status report.
547. [ ] Populate client update email template.
548. [ ] Add simplified client upload drop zone.
549. [ ] Store client uploads in dedicated folder.
550. [ ] Add theming via CSS variables.
551. [ ] Add branding settings page for logo/colors.
552. [ ] Track AI session duration/token cost.
553. [ ] Create draft billing time entry for AI work.
554. [x] Log admin actions immutably for SOC2.
555. [x] Create compliance export for auditor.
556. [x] Add CO_COUNSEL role.
557. [x] Restrict co-counsel to scoped folders/tags.
558. [ ] Add close matter workflow to archive storage.
559. [ ] Warn about restore costs on unarchive.
560. [ ] Add Clio/SimpleLegal connectors.
561. [ ] Sync time/expenses to external billing.
562. [ ] Add pitch deck template.
563. [ ] Generate pitch deck from similar past cases.
564. [ ] Add anonymization sanitizer for case studies.
565. [ ] Generate sanitized success story PDF.


## 11) Question-Derived Fixes (Malpractice/Spoliation/Privilege/Opposing/Billable/Judge/IT/Rainmaker)

566. [ ] Implement a "Negative Constraint" in the LLM System Prompt: "If the answer is not explicitly in the context, return exactly string 'NO_RECORD_FOUND'."
567. [ ] Add a frontend interceptor that detects the NO_RECORD_FOUND token and renders a specific "Evidence Missing" UI component instead of generic text.
568. [ ] Update IngestionPipeline.ts to use a legal-specific NLP model (like legal-bert) to classify opinion segments as majority, concurring, or dissenting.
569. [ ] Add a judicial_stance metadata field to the vector embeddings so search can filter out dissenting opinions by default.
570. [ ] Build a ShepardsAPI connector that runs a nightly cron job to check all cited statutes against a live legal database (Lexis/Westlaw API).
571. [ ] Implement a "Red Flag" icon overlay in the document viewer that appears dynamically if the API returns a "Negative Treatment" status.
572. [ ] Implement "Citation Teleport" logic that calculates the bounding box of the cited text during generation and verifies it falls within the page boundaries.
573. [ ] Disable the hyperlink if the confidence score of the page mapping drops below 95%, replacing it with a [Citation Unverified] warning.
574. [ ] Create a background "Adversarial Agent" that runs on upload, specifically prompted to find facts in Document A that negate facts in Document B.
575. [ ] Add a "Conflict Detected" dashboard widget that lists these discovered contradictions side-by-side for human resolution.
576. [ ] Enable logprobs in the LLM API call. If the average token probability for a factual assertion is < 99%, discard the answer.
577. [ ] Add a "Strict Scrutiny" toggle in the chat interface that passes this high-threshold parameter to the backend.
578. [ ] Create a jurisdiction_hierarchy map (e.g., SCOTUS > 9th Cir > CA Supreme Court) in CaseConfig.ts.
579. [ ] Modify the retrieval algorithm to boost scores of documents that match the current Matter's jurisdiction ID.
580. [ ] Store the start_char_index and end_char_index for every clause chunk in the vector database.
581. [ ] Use the React-PDF library to highlight text based on these indices when a user clicks a summary bullet point.
582. [ ] Force "Chain of Thought" output: requiring the model to output {"reasoning": "...", "answer": "..."} JSON.
583. [ ] Implement a collapsible "Why this case?" accordion inside the search results card that displays the reasoning field.
584. [ ] Trigger a validateCitation() function on file upload that parses case citations and pings the Lexis API for existence.
585. [ ] Add a verification_status: "verified" | "unknown" | "hallucinated" tag to the document schema.
586. [ ] Integrate a "KeyCite" signal scraper that runs immediately upon PDF text extraction.
587. [ ] Change the document icon color to Red in the file explorer if the system detects "Bad Law" signals.
588. [ ] Run a secondary "Critic Model" that compares the summary to the original text and calculates a semantic textual similarity (STS) score.
589. [ ] If STS score < 0.85, force the UI to display the original quote instead of the paraphrase.
590. [ ] Create two separate API routes: /api/chat/grounded (RAG only) and /api/chat/general (LLM knowledge).
591. [ ] Add a hard switch at the top of the chat window that defaults to "Grounded" and turns the UI distinctively blue when "Open" is active.
592. [ ] specific Regex parser to extract all standard citation formats (e.g., \d+ U.S. \d+) from user text inputs.
593. [ ] Add a "Validate Citations" button in the drafting toolbar that batch-checks these extracted regex matches.
594. [ ] If jurisdiction is null in the query, inject a prompt instruction: "Ask the user for jurisdiction before answering."
595. [ ] Store current_jurisdiction in the user session so the question is only asked once per thread.
596. [ ] Replace current masking logic with pdf-lib to physically remove text objects from the content stream.
597. [ ] Always save the redacted version as a new file (e.g., doc_v1_redacted.pdf) rather than overwriting the original.
598. [x] Calculate SHA-256 hash immediately upon file receipt and store in documents table column original_hash.
599. [x] Create a middleware that re-calculates the hash of the file being exported and throws 500 error if it doesn't match original_hash.
600. [x] Create a dedicated audit_logs table that records USER_ID, DOC_ID, ACTION: VIEW, and TIMESTAMP.
601. [x] Fire an async audit log event in the /api/documents/:id/content GET route.
602. [x] Implement rotation as a CSS transform (transform: rotate(90deg)) so the underlying file remains untouched.
603. [x] If permanent rotation is requested, enforce a "Save As New Version" workflow in the backend controller.
604. [ ] Configure the image processing library (e.g., sharp or imagemagick) to explicitly withMetadata() during any conversion.
605. [ ] Add a test case in CI/CD that uploads a photo with GPS data and asserts the downloaded photo still has GPS data.
606. [ ] Build a script generate_cert.py that queries the audit_logs table for a specific file history.
607. [ ] Bundle this generated PDF certificate automatically into the ZIP file whenever a "Legal Export" is triggered.
608. [ ] Add deleted_at timestamp column to all data tables.
609. [ ] Update all find queries to include where: { deleted_at: null } (Soft Delete pattern).
610. [ ] Accept recursive folder uploads and store the relative path string (e.g., folder/subfolder/file.txt) in the DB.
611. [ ] Use a library like archiver to reconstruct the directory tree inside the export ZIP file based on those stored paths.
612. [x] Create a CheckLegalHold middleware that runs before any DELETE or UPDATE route.
613. [x] If matter.is_hold_active === true, throw a 403 Forbidden error immediately.
614. [x] Create a work_products table linked to the chain_of_custody table.
615. [x] When a user saves an AI summary, generate a static PDF snapshot of it and hash it for the chain of custody.
616. [x] Update the Bates stamping loop to check if (doc.tags.includes('privileged')) continue;.
617. [x] Add a "Placeholder Page" option for skipped docs that says "Document withheld due to Privilege".
618. [ ] Store original file metadata (Creation Date, Mod Date) in JSON format alongside the file.
619. [ ] Use the touch command or file system API during the zip creation process to explicitly set the timestamp of the exported file to the stored original date.
620. [ ] Integrate ffmpeg on the server to transcode proprietary formats to MP4 for viewing (proxy).
621. [ ] Keep the original .dav or .braw file in "Cold Storage" S3 bucket for the "Download Native" button.
622. [ ] Store annotations as JSON coordinates (X, Y, content) in a separate annotations table, not burned into the PDF.
623. [ ] Render these as absolute-positioned HTML div elements on top of the PDF canvas.
624. [x] Create a specialized SQL query that filters audit logs for a specific doc_id and groups by User.
625. [x] Add a "Who viewed this?" button in the document toolbar that triggers this report.
626. [x] Hardcode a filter in the vector database query: filter: { is_privileged: { $ne: true } }.
627. [ ] When a document is tagged "Privileged", immediately trigger a function to update its metadata in the Vector Index.
628. [ ] Train a lightweight BERT classifier to flag documents containing phrases like "Attorney-Client," "Work Product," or emails involving outside counsel domains.
629. [ ] Auto-tag these as potential-privilege and blur the preview until a human confirms.
630. [ ] Implement a Redis flush for specific document keys.
631. [ ] The Clawback button must execute: 1. Mark DB is_privileged=true, 2. Delete Vector ID, 3. Invalidate CDN cache.
632. [x] Add allowed_user_ids array to the Matter schema.
633. [x] In authScope.ts, check if the requesting user is in the allowed_user_ids list for that Matter ID.
634. [x] Create a dedicated ROLE_CLIENT.
635. [x] In all API list endpoints, add if (user.role === 'CLIENT') query.where.type = 'PUBLIC'.
636. [ ] Switch to Azure OpenAI or AWS Bedrock "Zero Data Retention" endpoints.
637. [ ] Explicitly set opt_out_training: true in the model configuration/headers.
638. [ ] Route all external legal search queries through a backend proxy server.
639. [ ] Strip user identifiers and IP addresses at the proxy level before forwarding the request to the search provider.
640. [ ] Implement a "Find and Redact" modal that accepts a string (e.g., a name) and finds all instances across selected docs.
641. [ ] Create a background job queue (BullMQ) to process these redactions asynchronously so the browser doesn't crash.
642. [ ] Ensure the "OCR/Text Extraction" step happens after redaction burn-in for any public-facing AI features.
643. [ ] Use the flattened, redacted PDF as the source for generating embeddings, not the original source file.
644. [ ] Create a PrivilegeLog state machine: Draft -> Pending_Partner_Review -> Approved.
645. [ ] Disable the "Export Privilege Log" button unless status is Approved.
646. [x] Hide the "Download" icon in the React component if permissions.can_download is false.
647. [x] Block the /api/file/download/:id route for that role, serving only the /api/file/stream/:id (viewing) route.
648. [x] Add a privilege_type enum field (ACP, WPD, Joint Defense) to the document tags.
649. [ ] Allow users to filter exports by these specific sub-types (e.g., produce Work Product but withhold ACP).
650. [ ] Build an "Offboarding Wizard" in the Admin panel.
651. [ ] Execute a bulk update query: UPDATE matters SET owner_id = new_owner_id WHERE owner_id = old_user_id.
652. [x] Create a llm_audit table storing the full JSON payload of every request sent to the AI provider.
653. [x] Encrypt this specific table heavily, as it contains aggregated sensitive context.
654. [x] Clear localStorage, sessionStorage, and React Query caches explicitly on the logout action.
655. [x] Blacklist the JWT token in Redis with a generic expiry time to prevent replay attacks.
656. [ ] Return sentence_index or snippet along with the vector search result.
657. [ ] Highlight the exact source sentences in Yellow on the document viewer when the summary is hovered.
658. [ ] Store ALL timestamps in UTC in the database.
659. [ ] Use a library like date-fns to convert UTC to the user's browser locale time only at the moment of rendering.
660. [ ] Add a step in the ingestion pipeline to call a deepfake detection API (like Deepware or Sentinel).
661. [ ] Display a "Authenticity Score" gauge on video exhibits.
662. [ ] Implementation Elasticsearch or Postgres Trigram indexes (pg_trgm) for fuzzy string matching.
663. [ ] Add a "Did you mean...?" prompt in the search results UI for near-miss typos.
664. [ ] Swap standard Tesseract OCR for Azure Read API or AWS Textract (which handle handwriting).
665. [ ] Trigger the advanced OCR specifically when image_classification suggests "handwritten notes".
666. [ ] Enforce document_versions table. Never UPDATE a document row; always INSERT a new version row.
667. [ ] Add a "Version History" dropdown in the document viewer allowing users to revert to or view any past state.
668. [ ] Build a "Transcript Editor" interface that plays audio synced with text.
669. [ ] Save corrections as a new version of the transcript file, keeping the AI-generated original for comparison.
670. [ ] Create a routine that iterates through all docs tagged "Privileged" and extracts metadata (Date, Author, Recipient, Subject).
671. [ ] Generate a standard Excel/PDF formatted Privilege Log from this data automatically.
672. [x] Validate file headers (Magic Numbers) to ensure a .pdf is actually a PDF and not a renamed .exe.
673. [x] Run a ClamAV (or similar) malware scan stream on the upload buffer.
674. [ ] Integrate pandoc or similar libraries to convert internal formats to standard .docx, .pdf, or .txt on demand.
675. [ ] Ensure PDF exports utilize PDF/A-1b standard for long-term archival compliance.
676. [ ] Integrate a PST parsing library (like pst-extractor for Node).
677. [ ] Automatically explode the PST into individual email records and attachments, preserving parent-child relationships in the DB.
678. [ ] Run Named Entity Recognition (NER) on the dataset to extract unique Person names.
679. [ ] Generate a "People" tab that lists these entities by frequency, allowing users to map them to roles (e.g., "Plaintiff," "Witness").
680. [ ] Prompt the LLM to extract (Date, Event, Citation) tuples from every document.
681. [ ] Feed these tuples into a timeline visualization library (like vis.js) for an interactive chronological view.
682. [ ] Build a MS Word Add-in using the Office JS API.
683. [ ] Add a "Insert from LexiPro" button in Word that pulls the selected text from the web app.
684. [ ] Scan the user's draft in Word for citation patterns.
685. [ ] Replace plain text citations with hyperlinks pointing to the corresponding Case Law URL in LexiPro/Lexis.
686. [ ] Implement Hybrid Search (Vector + Keyword) with a slider to adjust the weight of "Semantic" vs "Exact" match.
687. [ ] Allow users to highlight a paragraph and search for "Like this" (Concept search using the paragraph as the query vector).
688. [ ] Run a background clustering algorithm (K-Means) on document embeddings.
689. [ ] Show "More like this" in the sidebar of the document viewer based on cluster proximity.
690. [ ] Allow users to tag documents with a Witness Name.
691. [ ] "One-Click Binder": Compiles all docs tagged with that witness + the Chronology report for that witness into a single PDF.
692. [ ] Trigger the conflict check logic (search_names_in_db) instantly upon entering a new Contact in the intake form.
693. [ ] Display a "Clear" (Green) or "Potential Conflict" (Red) badge next to the name immediately.
694. [ ] Integrate Google Translate or DeepL API.
695. [ ] Implement a Split View component: Original PDF on the left, Translated Text on the right, synced by scroll position.
696. [ ] Use the SHA-256 hashes calculated at ingest to identify exact duplicates.
697. [ ] Mark duplicates as "hidden" in the review queue but maintain a link to the "Master" document (Parent).
698. [ ] Listen for keydown events in the Review module (e.g., '1' for Responsive, '2' for Privilege).
699. [ ] Ensure tagging via shortcut is optimistic (updates UI instantly) while saving to DB in background.
700. [ ] Implement a rules engine that calculates dates (e.g., "Complaint Date + 30 days").
701. [ ] Render these calculated dates on a "Calendar Widget" in the main dashboard.
702. [ ] Use a PDF manipulation library to overlay Bates numbers on a set of selected PDFs.
703. [ ] Bundle these into a single printable PDF file (Merging) for download.
704. [ ] Add a "Archive Project" status that makes the project Read-Only for all users.
705. [ ] Move the project's S3 files to "Glacier" or "Infrequent Access" storage tiers to reduce hosting costs.
706. [ ] Update system prompt to: "Act as a neutral judicial clerk. Do not advocate; analyze objectively."
707. [ ] Periodically test the model with a set of "benchmark bias questions" to track neutrality over time.
708. [ ] When generating an argument, automatically trigger a second pass: "Now generate the strongest counter-argument to the text above."
709. [ ] Display the argument and counter-argument in a "swot analysis" style view.
710. [ ] Add a prominent modal before the tool opens: "AI prediction tools may reflect historical biases. Use with caution."
711. [ ] Exclude protected class attributes (race, religion) from the feature set sent to the prediction model to prevent explicit bias.
712. [ ] Import a dataset of Judge analytics (if available/licensed) or allow user to upload "Past Rulings" of the specific judge.
713. [ ] Create a specific RAG context using only that Judge's past opinions to generate "Style-matched" advice.
714. [ ] Use a sentiment analysis model to detect highly emotional or aggressive adjectives in draft text.
715. [ ] Underline these words in yellow and tooltip: "Subjective language - consider rephrasing for neutrality."
716. [ ] Embed the deposition text and the trial testimony text.
717. [ ] specific "Contradiction Search" to highlight areas where the semantic meaning of the testimony diverges.
718. [ ] Apply a time-decay function to the search ranking algorithm (newer cases get a score boost).
719. [ ] Add a "Sort by Date" option in the citations list.
720. [ ] For research queries, instruct the model to "Provide the majority view and the minority view."
721. [ ] Force the output into a structured format: "Pros," "Cons," "Conclusion."
722. [ ] Run sentiment analysis on ingested emails.
723. [ ] Allow filtering emails by "Sentiment: Angry" or "Sentiment: Happy" to find emotional pivot points in evidence.
724. [ ] Build a library of "Court Formatting Templates" (font size, margins) for major jurisdictions.
725. [ ] Apply these styles automatically when generating the final Brief DOCX.
726. [ ] If user provides settlement data, store it in a structured "Comps" table.
727. [ ] When asking for settlement value, retrieve similar cases from the Comps table to ground the estimate.
728. [ ] Enable "Transparent Data Encryption" (TDE) on the Postgres/SQL instance.
729. [ ] Use application-level encryption (e.g., pgcrypto) for highly sensitive columns (social security numbers, etc.).
730. [x] Configure the PWA Service Worker to cache the "My Cases" list and recently viewed documents.
731. [x] Implement an "Optimistic UI" that allows local edits while offline and syncs them to the server when connection is restored.
732. [x] Switch to an Auth provider that supports MFA (Auth0, Clerk, or AWS Cognito).
733. [x] Enforce an "MFA Required" policy in the admin settings for the organization.
734. [x] Create an IP Whitelist middleware that checks req.ip against a list of allowed CIDR blocks for the tenant.
735. [x] Add a UI in Admin Settings to input the office IP ranges.
736. [ ] Add a database hook (afterDelete) on the Matter model.
737. [ ] The hook must fire a call to the Vector DB to delete all vectors associated with that namespace or matter_id.
738. [ ] Upload files to a "Quarantine" bucket first.
739. [ ] Trigger an AWS Lambda (using ClamAV) to scan; only move to "Clean" bucket if pass.
740. [ ] Ensure the entire app (Frontend, Backend, DB, Redis, Vector DB) is defined in docker-compose or Kubernetes charts.
741. [ ] Abstract all cloud dependencies (like S3) to use interfaces that can be swapped for local file systems (MinIO).
742. [ ] Track failed login attempts in Redis (key: login_fail_${ip}).
743. [ ] If failures > 5 in 10 mins, lock the account and email the admin immediately.
744. [x] Never commit keys. Use Environment Variables (process.env.OPENAI_API_KEY).
745. [x] In production, inject these variables via a Secrets Manager (AWS Secrets Manager, Vault) at runtime.
746. [x] Implement SAML 2.0 or OIDC strategies in the auth layer (Passport.js or Auth0).
747. [x] Allow enterprise customers to upload their IdP metadata XML file in the Admin console.
748. [ ] Query recent Tasks completed, Documents added, and Billable hours for the Matter.
749. [ ] Populate these into a "Client Update Email" template that opens in the user's email client.
750. [ ] Create a simplified "Drop Zone" view for client users.
751. [ ] Ensure files uploaded by clients land in a specific "Client Incoming" folder to distinguish them from internal work.
752. [ ] Support CSS variables for primary colors and logo URL.
753. [ ] Add a "Branding" settings page where the firm can upload their Logo and pick their Hex color.
754. [ ] Track the duration/token cost of every AI interaction session.
755. [ ] Auto-create a "Draft Time Entry" in the billing module: "Legal Research (AI Assisted) - 0.2 hrs".
756. [ ] Ensure all admin actions (user creation, permission changes) are logged immutably.
757. [ ] Create a "Compliance Export" that dumps these logs for the auditor.
758. [ ] Create a CO_COUNSEL role with permissions between Associate and Client.
759. [ ] Allow granting access to specific folders or tags rather than the whole matter.
760. [ ] Implement a "Close Matter" workflow that changes storage class to "Archive".
761. [ ] UI should show "Restoring this matter will incur a cost" warning when un-archiving.
762. [ ] Build a connector for the Clio/SimpleLegal API.
763. [ ] Sync Time Entries and Expenses from LexiPro to the external billing system on a nightly schedule or on-demand.
764. [ ] Create a "Pitch Deck" generation template (Who we are, Our understanding of your case, Strategy).
765. [ ] Use RAG to pull "Similar Past Cases" won by the firm to populate the "Why Us" section of the pitch.
766. [ ] (Bonus) Create a "Sanitize" function that replaces proper names with [Plaintiff], [Defendant], [Company] in the export.
767. [ ] Format the sanitized summary into a marketing-ready "Success Story" PDF.