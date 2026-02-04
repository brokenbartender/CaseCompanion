# License Hygiene & SBOM

## SBOM Artifacts
- `reports/sbom/cyclonedx-frontend.json` (frontend dependencies)
- `reports/sbom/cyclonedx-server.json` (server dependencies)

## License Inventory
- `reports/sbom/licenses-frontend.json`
- `reports/sbom/licenses-server.json`

## Provider Dependencies (Model / Inference)
- Gemini API via `@google/genai` (server-side, external provider)
- Ollama local runtime (optional fallback / offline mode)

## GPL / AGPL Risk Check
- A string scan over `reports/sbom/licenses-*.json` for `GPL` or `AGPL` returned no matches.
- If procurement requires, run a full license audit with allow/deny lists and verify transitive licensing.

## Ownership Notes
- All custom application code is first-party within this repository.
- Third-party dependencies are captured in the SBOM artifacts above.
