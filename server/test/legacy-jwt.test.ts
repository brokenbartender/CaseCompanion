import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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

function setProdEnv() {
  process.env.NODE_ENV = "production";
  process.env.DISABLE_AUTOSTART = "true";
  process.env.JWT_SECRET = "prod-strong-secret-123456";
  ensureSigningKeys();
  process.env.GENESIS_SEED = "prod-genesis-seed-123456";
  process.env.JWT_ISSUER = "https://issuer.lexipro.local";
  process.env.JWT_AUDIENCE = "lexipro";
  process.env.CORS_ORIGINS = "https://lexipro.example";
  process.env.ALLOW_DEMO_IN_PROD = "true";
  process.env.STORAGE_ENCRYPTION_CONFIRMED = "true";
  process.env.EVIDENCE_MASTER_KEY_B64 = crypto.randomBytes(32).toString("base64");
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.RELEASE_CERT_PRIVATE_KEY_B64 = Buffer.from(privatePem).toString("base64");
  process.env.RELEASE_CERT_PUBLIC_KEY_B64 = Buffer.from(publicPem).toString("base64");
}

test("production startup fails when legacy JWT bypass is enabled", async () => {
  setProdEnv();
  process.env.ALLOW_LEGACY_JWT = "true";

  try {
    await assert.rejects(
      () => import(`../index.ts?legacy=${Date.now()}`),
      (err: any) => {
        assert.match(String(err?.message || ""), /ALLOW_LEGACY_JWT/);
        return true;
      }
    );
  } finally {
    restoreEnv();
  }
});
