import test from "node:test";
import assert from "node:assert/strict";
import { sendIntakeWebhook, resolveIntakeWebhookUrl, WEBHOOK_TIMEOUT_MS } from "../webhookSecurity.js";

test("Webhook security blocks internal hosts in production", async () => {
  await assert.rejects(
    async () => {
      resolveIntakeWebhookUrl("https://127.0.0.1/webhook", "production");
    },
    /Internal network egress prohibited/
  );
});

test("Webhook client aborts after timeout", async () => {
  assert.equal(WEBHOOK_TIMEOUT_MS, 5000);
  const start = Date.now();
  const fetchImpl = (_url: string, opts: any) => {
    return new Promise((_resolve, reject) => {
      if (opts?.signal) {
        opts.signal.addEventListener("abort", () => {
          const err = new Error("Aborted");
          (err as any).name = "AbortError";
          reject(err);
        });
      }
    });
  };

  await assert.rejects(
    async () => {
      await sendIntakeWebhook(
        "https://example.com/webhook",
        { ok: true },
        { fetchImpl, timeoutMs: 50, nodeEnv: "production" }
      );
    },
    /Aborted/
  );
  const elapsed = Date.now() - start;
  assert.ok(elapsed >= 45, `Expected timeout, got ${elapsed}ms`);
});
