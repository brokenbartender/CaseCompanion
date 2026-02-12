# JusticeAutomator Gap Analysis (Phase 1)

## Context
- Base repo: CaseCompanion (Node/TypeScript web app)
- Requested module track: Python/Streamlit + templated complaint drafting + court deadline management

## Required Modules vs Current State
- `database/schema.sql`: Missing
- `templates/complaint_master.docx`: Missing
- `app.py`: Missing
- `logic/court_rules.py`: Missing
- `requirements.txt`: Missing
- `plan.json`: Missing
- `logs/rolling_log.md`: Missing

## Integration Strategy
1. Add an isolated Python sub-track at repo root for JusticeAutomator artifacts.
2. Keep existing Node application untouched.
3. Add explicit legal-safety disclosures in all generated outputs.
4. Build a council orchestration layer (proposer/critic/judge) with user-approval gating.

## Phase Plan
- Phase 1 (Ingestion & Planning): blueprint, plan, logging scaffolding.
- Phase 2 (Execution): implement schema, rules, app, complaint template pipeline, council flow.
- Phase 3 (Validation): runtime checks, default field checks, caption verification, results summary.
