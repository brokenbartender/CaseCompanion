# CSP Exceptions (Production)

This document captures the minimal production exceptions required for LexiPro Forensic OS.

Allowed:
- `worker-src 'self' blob:` for PDF.js worker execution.
- `img-src 'self' data: blob:` for evidence previews and rendered PDF canvases.
- `connect-src 'self' http://backend:8787 http://localhost:8787` for local API access in on-prem demos.

Not allowed in production:
- `script-src 'unsafe-inline'` and `script-src 'unsafe-eval'`
- `style-src 'unsafe-inline'`
- `object-src` (explicitly disabled)

If a new feature requires additional sources, update this file and document the justification.
