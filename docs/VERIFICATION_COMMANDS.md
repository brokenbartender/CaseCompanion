# Verification Commands (PowerShell)

Root:
```powershell
npm ci
npm run build
npm test
npm audit --audit-level=high
```

Server:
```powershell
npm ci --prefix server
npm run build --prefix server
npm test --prefix server
npm audit --audit-level=high --prefix server
```

PASS criteria:
- Builds complete with exit code 0.
- Tests report 0 failures.
- Audits report "found 0 vulnerabilities".
