# LexiPro Integration Fit – LexisNexis Acquisition Playbook
Position LexiPro not as a competitor but as the missing organ that completes LexisNexis’ forensic AI stack.

## Embed inside Lexis+ via Shadow DOM
- LexiPro runs entirely inside a `<lexipro-app>` component housed in Shadow DOM. That means Lexis+ or any Lexis portal can drop us in without CSS bleed or JS collision, and it appears native because the host page still controls fonts and layout outside the capsule.
- Talking point: “We’re a plug-in widget, not a separate experience—embed us inside Lexis+ and the agent never has to leave their workflow.”

## API-only forensic engine
- The Node/Express backend exposes REST endpoints for ingestion, anchoring, guardrails, and telemetry. Lexis gets a full forensic engine API they can call from new or existing tools.
- Talking point: “Lexis can call our API from lower-level services if they prefer to keep the UI internal; we’re a serious, documented engine, not just a shiny front-end.”

## White-label internal module
- LexiPro can be white-labeled inside Lexis’ internal litigation centers. The deterministic guardrails, hash chains, and teleporting anchors show up under Lexis branding without exposing the independent UI.
- Talking point: “White-label us for any Lexis portal so every document stays anchored to the same tamper-proof workflow.”

## CoCounsel grounding backend
- CoCounsel is ideal for Lexis’ α-stage legal AI workflows. LexiPro becomes the grounding backend that enforces zero-temperature + PRP-001 guardrails and only surfaces citations proven by the anchor ledger.
- Talking point: “Before CoCounsel answers your client, we guarantee every citation is physically grounded with SHA-256 backing.”

## Litigation review augmentation
- LexiPro ups attorney productivity by visualizing anchors, teleporting them to claims, and providing automatic settlement-gap insights via analyzeMisconduct (ROI signals). It augments litigation review rather than replacing it.
- Talking point: “LexiPro turns litigation review into a high-integrity profit center: less time searching, more time litigating.”

**Close as a missing organ:**
- Frame LexiPro as the deterministic evidence engine LexisNexis needs to close the AI trust gap. “You already have Lexis+ and CoCounsel. LexiPro is the deterministic organ that feeds them trusted evidence so they can’t hallucinate.”
- Mention the live guardrails, cryptographic ledger, and audit trail as Lexis’ differentiators once they ship it in.
