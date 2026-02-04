import test from "node:test";
import assert from "node:assert/strict";
import { ensureSigningKeys } from "./helpers/signingKeys.js";

const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    process.env[key] = value;
  }
}

function setBaseEnv() {
  process.env.NODE_ENV = "test";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "test-secret";
  process.env.GENESIS_SEED = "test-genesis";
  process.env.AUTH_COOKIE_NAME = "forensic_token";
  process.env.CSRF_COOKIE_NAME = "forensic_csrf";
  ensureSigningKeys();
}

function makeCookie(token: string, csrfToken: string) {
  return `forensic_token=${encodeURIComponent(token)}; forensic_csrf=${encodeURIComponent(csrfToken)}`;
}

test("CSRF rejects POST when auth cookie present but header missing", async () => {
  setBaseEnv();
  const { app } = await import(`../index.ts?csrf=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: makeCookie("fake-token", "csrf-token")
      }
    });

    assert.equal(res.status, 403);
    const json = await res.json().catch(() => ({}));
    assert.equal(json?.error, "Invalid CSRF token");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    restoreEnv();
  }
});

test("CSRF rejects POST when header does not match cookie", async () => {
  setBaseEnv();
  const { app } = await import(`../index.ts?csrfmismatch=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: makeCookie("fake-token", "cookie-token"),
        "x-csrf-token": "header-token"
      }
    });

    assert.equal(res.status, 403);
    const json = await res.json().catch(() => ({}));
    assert.equal(json?.error, "Invalid CSRF token");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    restoreEnv();
  }
});

test("CSRF Protection: Should reject requests with auth cookie but missing/invalid CSRF header", async () => {
  setBaseEnv();
  const { app } = await import(`../index.ts?csrfblock=${Date.now()}`);
  const server = app.listen(0);

  try {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const cookie = makeCookie("fake-token", "csrf-token");

    const responseMissing = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookie
      }
    });
    assert.equal(responseMissing.status, 403);

    const responseInvalid = await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "x-csrf-token": "invalid-token-123"
      }
    });
    assert.equal(responseInvalid.status, 403);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    restoreEnv();
  }
});
