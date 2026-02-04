# Threat Model Defaults

## Tenancy
- Workspace is the hard boundary. No cross-workspace reads.

## Least Privilege
- Default role is read-only unless explicitly granted.
- High-risk actions require Partner or Admin sign-off.

## Data Handling
- Encrypt at rest and in transit.
- Log all exports, redactions, deletions, and external shares.

## Sharing
- External shares require time-bound links or explicit approval.

## Retention
- Retention policy is per matter. Deletions are soft by default.
