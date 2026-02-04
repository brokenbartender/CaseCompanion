# Crypto Shredding Protocol (Aggressive Amnesia)

## Purpose
LexiPro implements a workspace-scoped cryptographic shredding mechanism. When a workspace is deleted, its encryption key is destroyed, rendering any residual ciphertext (including backups) mathematically unrecoverable.

## Design Overview
- **Workspace Key:** Each workspace is assigned a unique 256-bit key at creation time.
- **At-Rest Encryption:** Files are encrypted with AES-256-GCM using the workspace key before any storage I/O.
- **Key Destruction:** Shredding a workspace destroys the workspace key, making all encrypted data irretrievable.

## Operational Flow
1. **Ingestion:** Evidence is encrypted with the workspace key.
2. **Storage:** Encrypted payload is stored on disk or S3.
3. **Shred:** On workspace deletion, the workspace key is wiped and removed.
4. **Aftermath:** Any recovered database rows or file backups are unusable ciphertext.

## Security Guarantees
- **Forward secrecy for data at rest:** Once the key is destroyed, data cannot be decrypted.
- **Tamper-evident posture:** Shredding is auditable and irreversible.
- **Minimal blast radius:** Keys are scoped per workspace, not global.

## Implementation Notes
- AES-256-GCM provides authenticated encryption (confidentiality + integrity).
- Shredding includes explicit key overwrite before deletion.
- Fail-safe behavior: decryption attempts without a key throw an access error.
