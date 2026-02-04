# SOC 2 Control Mapping

| Control | Requirement | LexiPro Capability |
| --- | --- | --- |
| CC6.1 (Logical Access) | Restrict logical access to authorized users. | Role Simulation toggle (read-only vs. investigator) and authenticated access gates for exhibits and audit APIs. |
| CC2.1 (Security Governance) | Maintain security policies and oversight. | Integrity Audit Ledger with signed events and governance dashboards. |
| A1.2 (Data Integrity) | Protect data from unauthorized modification. | SHA-256 hashing, asymmetric audit signatures, and dual-write log shipping to WORM storage. |
| CC8.1 (Change Management) | Evaluate and authorize changes prior to implementation. | CODEOWNERS-enforced review gates and CI required checks for build, lint, typecheck, and tests on pull requests. |
