# Deployment Environment Requirements

This document lists the required environment variables for a production-ready LexiPro Forensic OS deployment.
Use strong, non-default values. Do not reuse example placeholders in production.

## Core required (all environments)
- `JWT_SECRET` - strong random secret for JWT signing.
  - Example format: `JWT_SECRET=base64:Zm9vYmFy...` or a 32+ char random string.
- `REPORT_SIGNING_SECRET` - secret used for integrity report signing.
  - Example format: `REPORT_SIGNING_SECRET=base64:YWJjMTIz...`
- `GENESIS_SEED` - seed used for chain genesis hashing.
  - Example format: `GENESIS_SEED=base64:Z2VuZXNpcw...`

## Production-only required
- `RELEASE_CERT_PRIVATE_KEY_B64` - base64-encoded Ed25519 private key (PEM).
- `RELEASE_CERT_PUBLIC_KEY_B64` - base64-encoded Ed25519 public key (PEM).
  - Example format:
    - `RELEASE_CERT_PRIVATE_KEY_B64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...`
    - `RELEASE_CERT_PUBLIC_KEY_B64=LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0t...`
- `CORS_ORIGINS` - comma-separated list of allowed browser origins.
  - Example: `CORS_ORIGINS=https://app.example.com,https://demo.example.com`

## Enterprise SSO (OIDC)
- `OIDC_ISSUER_URL` - issuer discovery URL for Okta/Auth0/Azure AD.
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_REDIRECT_URI` - callback URL handled by `/api/auth/oidc/callback`.
- `OIDC_JWKS_URL` (optional) - override JWKS URL if discovery is blocked.

## Conditional (only if `STORAGE_STRATEGY=S3`)
- `AWS_BUCKET_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
 - `AWS_SSE_MODE` (required; `aws:kms` or `AES256`)
 - `AWS_KMS_KEY_ID` (required when `AWS_SSE_MODE=aws:kms`)
 - `AWS_SSE_BUCKET_KEY_ENABLED` (optional; `true`/`false`, KMS cost optimization)
  - Example format:
    - `AWS_BUCKET_NAME=lexipro-prod`
    - `AWS_ACCESS_KEY_ID=AKIA...`
    - `AWS_SECRET_ACCESS_KEY=...`
    - `AWS_SSE_MODE=aws:kms`
    - `AWS_KMS_KEY_ID=1234abcd-...`
    - `AWS_SSE_BUCKET_KEY_ENABLED=true`
- Optional:
  - `AWS_REGION` (defaults to `us-east-1`)

## Notes
- `STORAGE_STRATEGY` defaults to `DISK` if unset.
- `ENFORCE_SECURE_SECRETS=true` is recommended in production.
- For disk storage in production, `STORAGE_ENCRYPTION_CONFIRMED=true` is required and `uploads/` must be on an encrypted volume
  (BitLocker on Windows, LUKS/dm-crypt on Linux, or an encrypted host volume for Docker).
- For disk storage in production, `EVIDENCE_MASTER_KEY_B64` is required to enable envelope encryption (AES-256-GCM).
- For demos, ensure `CORS_ORIGINS` includes the demo UI origin.
- CI uses dummy placeholders for required envs; never reuse CI dummy values in production.

<!-- Remaining steps (memory): run Prisma migration for lockout fields, add auth lockout/password tests, implement token revocation/refresh, add Docker healthcheck + non-root user, and consider app-level envelope encryption. -->

## Demo-safe defaults
- For local demo: STORAGE_STRATEGY=LOCAL, CORS_ORIGINS=http://localhost:5173
