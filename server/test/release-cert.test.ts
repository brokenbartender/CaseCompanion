import test from "node:test";
import assert from "node:assert/strict";
import { verifyReleaseCert } from "../lib/releaseCert.js";
import { ensureSigningKeys } from "./helpers/signingKeys.js";

let prismaClientAvailable = false;
try {
  const mod: any = await import("@prisma/client");
  prismaClientAvailable = typeof mod?.PrismaClient === "function";
} catch {
  prismaClientAvailable = false;
}

test(
  "release certificate headers are attached on 200 and 422",
  { skip: !prismaClientAvailable },
  async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret";
    ensureSigningKeys();
    process.env.GENESIS_SEED = "test-genesis";
    delete process.env.RELEASE_CERT_PRIVATE_KEY_B64;
    delete process.env.RELEASE_CERT_PUBLIC_KEY_B64;

    const { app } = await import("../index.ts");
    process.env.RELEASE_CERT_PRIVATE_KEY_B64 = "";
    process.env.RELEASE_CERT_PUBLIC_KEY_B64 = "";

    const server = app.listen(0);
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      const okRes = await fetch(`http://127.0.0.1:${port}/api/test/release-cert`);
      const okHeader = okRes.headers.get("x-lexipro-release-cert");
      const okDigest = okRes.headers.get("x-lexipro-evidence-digest");
      const okTrust = okRes.headers.get("x-lexipro-trust");
      const okChain = okRes.headers.get("x-lexipro-release-chain");

      assert.equal(okRes.status, 200);
      assert.ok(okHeader);
      assert.ok(okDigest);
      assert.ok(okTrust);
      assert.ok(okChain);
      const okVerified = verifyReleaseCert(okHeader || "");
      assert.equal(okVerified.valid, true);
      assert.equal(okVerified.payload?.decision, "RELEASED");

      const metaRes = await fetch(`http://127.0.0.1:${port}/api/test/guardrails-meta`);
      const meta = await metaRes.json();

      assert.equal(okVerified.payload?.v, meta.releaseCert.version);
      assert.equal(okVerified.payload?.kid, meta.releaseCert.kid);

      const okRes2 = await fetch(`http://127.0.0.1:${port}/api/test/release-cert`);
      const okHeader2 = okRes2.headers.get("x-lexipro-release-cert");
      const okChain2 = okRes2.headers.get("x-lexipro-release-chain");

      assert.equal(okRes2.status, 200);
      assert.ok(okHeader2);
      assert.ok(okChain2);
      const okVerified2 = verifyReleaseCert(okHeader2 || "");
      assert.equal(okVerified2.valid, true);
      assert.equal(okVerified2.payload?.chain?.seq, (okVerified.payload?.chain?.seq || 0) + 1);
      assert.equal(okVerified2.payload?.chain?.prev, okVerified.payload?.chain?.hash);

      const blockedRes = await fetch(`http://127.0.0.1:${port}/api/test/release-cert/blocked`);
      const blockedHeader = blockedRes.headers.get("x-lexipro-release-cert");
      const blockedDigest = blockedRes.headers.get("x-lexipro-evidence-digest");
      const blockedTrust = blockedRes.headers.get("x-lexipro-trust");
      const blockedChain = blockedRes.headers.get("x-lexipro-release-chain");

      assert.equal(blockedRes.status, 422);
      assert.ok(blockedHeader);
      assert.ok(blockedDigest);
      assert.ok(blockedTrust);
      assert.ok(blockedChain);
      const blockedVerified = verifyReleaseCert(blockedHeader || "");
      assert.equal(blockedVerified.valid, true);
      assert.equal(blockedVerified.payload?.decision, "WITHHELD_422");
      assert.equal(blockedVerified.payload?.chain?.seq, (okVerified2.payload?.chain?.seq || 0) + 1);
      assert.equal(blockedVerified.payload?.chain?.prev, okVerified2.payload?.chain?.hash);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
);
