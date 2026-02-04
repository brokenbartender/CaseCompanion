LexiPro Forensic OS - Acquisition Readiness
===========================================

Summary
-------
This repository enforces deterministic AI behavior. AI calls are bounded by hard timeouts, guarded by a handler watchdog, and abort propagated through provider calls. Outputs are either grounded (anchorId-based) or withheld with structured, auditable errors. There are no silent failures or indefinite awaits.

Enforced Guarantees
------------------
- No Anchor -> No Output: requests without candidate anchors return 422 and log audit + negative knowledge.
- Deterministic timeouts: /api/ai/chat returns within AI_REQUEST_TIMEOUT_MS (+500ms buffer) or returns 504 with structured JSON.
- Abort propagation: AbortController is passed through all AI layers (route -> provider).
- Audit finalization: every AI attempt logs a terminal event (AI_CHAT_ANCHORED + AI_CHAT_RELEASED, or AI_RELEASE_GATE_BLOCKED).
- AnchorId-only contract: prompts require anchorIds, not citation strings.

Buyer-Facing Observability
--------------------------
- /api/ai/status includes provider, model, timeoutMs, health, and last failover.
- Safe logs:
  - AI_CHAT_START (requestId/provider/model)
  - AI_CHAT_DONE
  - AI_CHAT_TIMEOUT
  - AI_CHAT_ERROR

Release Certificate
-------------------
- Every AI release or 422 withhold returns `X-LexiPro-Release-Cert` (compact JWS).
- Verify offline with the public key from `/api/ai/guardrails`.
- Env keys: `RELEASE_CERT_PRIVATE_KEY_B64` and `RELEASE_CERT_PUBLIC_KEY_B64` (base64 PEM).
- Certificate payload includes `v` (version) and `kid` (public key fingerprint).
- `kid` is sha256(publicPem) truncated to 16 hex chars for stable verification.
- `X-LexiPro-Evidence-Digest` binds outputs to anchor metadata without exposing text.
- `X-LexiPro-Trust` summarizes policy/decision/version/kid for quick audit grep.
- Release Chain embeds `chain.v/seq/prev/hash` inside the signed payload for tamper-evident ordering.
- `X-LexiPro-Release-Chain` exposes short-form chain values for quick inspection.
- `seq` increments per workspace; `prev` is the prior cert hash (or genesis).
- Genesis uses `GENESIS_SEED` if set; otherwise the literal `GENESIS`.
- Chain is instance-local unless you wire persistence.

Verification Script
-------------------
Run the bounded-response proof script from any clone location:

```
cd <repo>
powershell -ExecutionPolicy Bypass -File .\scripts\verify-ai-bounded.ps1
```

Expected outcomes:
- Normal mode: /api/ai/chat returns within the timeout (success or structured error).
- Ollama down: /api/ai/chat returns 502/504 quickly with structured JSON (no hang).

Verification Flow
-----------------
- Clone repo and push a commit to `main` to see the required checks go green.
- Run `scripts/verify-ai-bounded.ps1` to demonstrate bounded AI responses.
- Confirm audit logs include AI_CHAT_ANCHORED and AI_CHAT_RELEASED on success.

Green Check Commands
--------------------
From repo root:

```
npm run build
npm test
npm --prefix server run build
```

Success signatures:
- Frontend build: "vite build" completes with "built in" line.
- Backend build: "tsc --noEmit" exits 0.
- Tests: "pass 17" and "fail 0".

Notes
-----
- .env.example contains AI knobs (AI_MAX_ANCHORS, AI_MAX_CONTEXT_CHARS, AI_MAX_FINDINGS).
- No secrets are committed.
