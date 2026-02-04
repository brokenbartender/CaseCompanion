
# LexiPro Enterprise Deployment Guide

## Architecture Overview
LexiPro is designed as a **Secure Frontend Logic Layer**. For enterprise deployment, follow these hardening protocols.

### 1. API Key Proxy (Mandatory)
In production, do not serve `process.env.API_KEY` to the client.
- Implement a thin Node.js/Python backend.
- Route all `geminiService.ts` requests through `/api/forensic-proxy`.
- Implement per-user rate limiting and request signing.

### 2. File Storage Hardening
Replace `storageService.ts` (IndexedDB) with an Enterprise Storage Provider:
- **Cloud:** AWS S3 (with Object Lock enabled for discovery immutability) or GCP Storage.
- **On-Prem:** MinIO or encrypted local drive mapping.
- **Encryption:** Use AES-256 for all stored Blobs.

### 3. Identity Provider (IdP)
Integrate with existing firm IdP:
- **SAML/OIDC:** Connect to Okta, Microsoft Entra ID (Azure AD), or Clio SSO.
- **RBAC:** Enforce `types.ts` UserRoles at the API Gateway level.

### 4. Forensic Compliance
- **Audit Logs:** Pipe `AccessLog` objects to a SIEM (e.g., Datadog, Splunk) or write to an append-only database (Postgres).
- **HITL:** Ensure the `VerificationHub` state is saved to a persistent DB to maintain the chain of custody.

## Deployment Checklist
- [ ] Build Frontend: `npm run build`
- [ ] Deploy via Docker (hardened Alpine base)
- [ ] Enable Nginx TLS 1.3
- [ ] Verify Zero-Retention Header propagation
