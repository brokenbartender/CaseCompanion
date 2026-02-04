# Demo Readiness Report

Date: 2026-01-23
Repo: brokenbartender/Enterprise
Branch: main

## What it is
Deterministic enterprise demo for "State v. Nexus" with anchored citations, teleport cues, and proof export.

## What is proven
- Gate A (demo:reset): PASS
- Gate B (api/health): PASS (200)
- Gate D (Playwright e2e): PASS (4/4)
- E2E specs: demo-ready, perjury-trap, proof-loop, teleport

## How to run
1) npm run demo:up
2) Open http://127.0.0.1:5173
3) Login with demo creds printed in the console

## Evidence artifacts
- Playwright traces under test-results/
- Proof packet export available in UI

## Known limitations
- Non-blocking 500s may appear from clio notifications in dev.
- Demo export in e2e validates download start and size, not full file contents.


