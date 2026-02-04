# Export Determinism

## Deterministic Export Contract
- Export packets must be reproducible given the same inputs.
- Every export generates a manifest with stable IDs + hashes.

## Required Manifest Fields
- ExportPacket ID
- Exhibit IDs + hashes
- Artifact IDs + source anchors
- Model + policy version
- Timestamp + actor

## Verification
- A verifier can recompute hashes from the exported packet and match the manifest.
- If mismatch, export is invalid and must be reissued.
