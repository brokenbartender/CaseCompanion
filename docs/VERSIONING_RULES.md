# Versioning Rules

## Immutable Sources
- Original uploads are immutable. Never overwrite or delete; create derived versions.

## Derived Versions
- Every transform (OCR, redact, Bates, QC, export) creates a new version.
- Versions form a chain; each version references its parent.

## Deterministic IDs
- Use stable IDs for Exhibits, Anchors, and Artifacts in manifests.

## Audit Binding
- Every version change must emit an AuditEvent with parent and child IDs.
