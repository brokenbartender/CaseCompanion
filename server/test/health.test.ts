import test from "node:test";
import assert from "node:assert/strict";
import { ensureSigningKeys } from "./helpers/signingKeys.js";

let prismaClientAvailable = false;
try {
  const mod: any = await import("@prisma/client");
  prismaClientAvailable = typeof mod?.PrismaClient === "function";
} catch {
  prismaClientAvailable = false;
}

test(
  "health endpoint responds ok",
  { skip: !prismaClientAvailable },
  async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "test-secret";
    ensureSigningKeys();
    process.env.GENESIS_SEED = "test-genesis";
    const { app } = await import("../index.js");

    const server = app.listen(0);
    try {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      const json = await res.json();

      assert.equal(res.ok, true);
      assert.equal(json.ok, true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
);
