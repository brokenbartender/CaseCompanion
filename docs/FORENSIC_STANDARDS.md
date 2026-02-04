# Forensic Standards

LexiPro Forensic OS enforces two non-repudiation controls to prevent silent tampering:

1) Full-Stream SHA-256 Hashing
Every verification pass hashes 100% of the file bytes using a streaming SHA-256 digest.
No byte ranges are skipped or sampled, ensuring large assets (multi-GB) are fully proven.

2) Cryptographic Audit Chaining
Each SystemAudit record stores a `previous_log_hash` and a `log_hash`. The `log_hash`
is the SHA-256 of the canonical audit payload plus the previous log hash, creating a
tamper-evident chain. Any mismatch in the chain triggers a SYSTEM_INTEGRITY_FAILURE alert.

Together, these controls make evidence integrity mathematically verifiable across time,
even for privileged users.
