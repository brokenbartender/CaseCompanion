# Technical Handover Briefing (Executive)

## What it is
Evidence-first legal AI demo with anchored citations and forensic export for the "State v. Nexus" case.

## What is proven
- Anchored citations across PDF, video, audio with teleport flash.
- Source conflict workflow validated by E2E tests.
- Proof packet export reachable from the UI.

## How to run
1) npm run demo:up
2) Open http://127.0.0.1:5173
3) Login with demo creds printed in the console
4) Click a citation to teleport and export the packet

## Evidence artifacts
- Playwright traces under test-results/
- Proof packet download from Evidence tab

## Known limitations
- Non-blocking 500s may appear from clio notifications in dev.


