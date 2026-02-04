# Architectural Provenance

This document summarizes the controls that make LexiPro Forensic OS audit-ready for enterprise acquisition.

## 1) Tenant Isolation
LexiPro enforces Global Workspace Scoping at the API layer. Every resource request is validated against the
requesting user's workspace and is rejected if the resource falls outside that scope. This prevents IDOR
and cross-tenant data exposure.

## 2) Chain of Custody (CoC)
LexiPro runs a scheduled SHA-256 integrity worker that hashes every stored exhibit. Any hash mismatch
creates an IntegrityAlert entry, providing an incident-response trail. The latest audit pulse is recorded
in SystemAudit so the system can show proof of continuous verification.

## 3) Non-Repudiation
LexiPro creates Digital Seals using HMAC-SHA256 with REPORT_SIGNING_SECRET and hashes a canonical
manifest that includes the workspace_id. SystemAudit logs are chained using previous_log_hash and an
audit_signature, so any tampering breaks the chain and is detectable.

## 4) Evidentiary Preservation
Evidence is never hard-deleted. Soft deletes mark records with deletedAt (and a reason for deletion),
allowing active views to hide removed items while preserving a complete forensic record.

## 5) License Compliance
All dependencies are permissively licensed (MIT, Apache-2.0, BSD, PostgreSQL). See `DEPENDENCIES.md`
for the full inventory and license summary used during diligence.
