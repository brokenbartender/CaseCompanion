# Security Overview

LexiPro Forensic OS is designed as a Zero-Trust evidence platform. The system assumes a hostile environment and enforces cryptographic integrity across every evidence operation.

## Reporting
If you discover a security issue, please report it privately to: security@lexipro.local.

## Safe Harbor
We support and welcome good-faith security research. If you:
- avoid privacy violations, data destruction, and service disruption,
- use only test accounts or data you own,
- and report findings promptly,
we will not initiate legal action or contact law enforcement for your research.
Please include steps to reproduce, impact assessment, and any relevant logs or proof-of-concept code.

## Zero-Trust Architecture
- RSASSA-PSS signing for audit events with public-key verification.
- Immutable Log Shipping to WORM storage for offsite, tamper-evident backups.
- Optical Verification Gate that blocks AI citations without pixel-matched source evidence.

## Data Integrity Controls
- SHA-256 hashing at ingest with continuous verification on read.
- Chain-of-custody ledger with signed, ordered audit events.
- Admissibility packets export evidence, ledger, and verification keys for offline review.

## Operational Security
- Role simulation for demo highlights read-only vs. investigator access paths.
- Audit trail for all access events with immutable shipping to cold storage.
