# LexiPro Forensic OS - Enterprise V2.1.0 (Audited)

## Core Pillars
- Zero-Trust Chain: RSASSA-PSS signing with hash-linked audit events.
- Optical Release Gate: No Anchor  No Output (pixel verification enforced).
- Immutable Log Shipping: Dual-write to S3 WORM for tamper-evident recovery.
- Admissibility Export: Self-authenticating .zip packets with Offline Validator.
- Security Posture: See SECURITY.md and docs/SOC2_CONTROLS.md.

## Quick Start (Demo)
- Seed demo data: `npm run seed`
- Red Team verification: `npm run sabotage`

## Diligence
- Technical diligence manifest: `TECHNICAL_DILIGENCE_MANIFEST.md`
- Proof packet overview: `proof/README.md`

## Risk Mitigation & Defensibility
LexiPro is engineered for hostile environments. Every access is signed, every chain is verifiable, and every evidence packet can be validated offline without LexiPro infrastructure.
## Process Proof
- Automated evidence captures: `server/exhibit_snapshots/`
- ROI dashboard: `/roi`
- Silent partner alerts: bell icon in header
## Troubleshooting
- Browser extension errors (chrome-extension://...) are not from LexiPro. Disable extensions or use Incognito when demoing.
