# Canonical Object Model

This document defines the minimal, stable objects that every feature must use. These are the contract for permissions, auditability, and export determinism.

## Core Objects
- Workspace
- Matter
- Document (immutable original + derived versions)
- Exhibit (ingested evidence item)
- Anchor (page + bbox + text span)
- Finding (AI claim linked to anchors)
- Artifact (extracted text, clause, timeline item, summary section)
- WorkflowRun / StepRun
- Policy / PolicyResult
- AuditEvent
- ExportPacket

## Object Rules
- Every Artifact must reference a Matter.
- Every Finding must reference at least one Anchor.
- Every ExportPacket must include a manifest with stable IDs for every Artifact and Exhibit included.
- Every high-risk action emits an AuditEvent.

## Relationships (minimal)
- Workspace -> Matter
- Matter -> Exhibit -> Anchor
- Matter -> Document -> Version
- Finding -> Anchor -> Exhibit
- WorkflowRun -> StepRun -> Artifact/Finding
- PolicyResult -> WorkflowRun or Artifact
- ExportPacket -> Artifact/Exhibit
