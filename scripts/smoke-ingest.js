import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
const email = process.env.SMOKE_EMAIL || "";
const password = process.env.SMOKE_PASSWORD || "";
const approvalToken = process.env.SMOKE_APPROVAL_TOKEN || "";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("reports", "smoke", timestamp);

const cookieJar = new Map();

function storeCookies(setCookie) {
  if (!setCookie) return;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const entry of list) {
    const [pair] = entry.split(";");
    const [key, value] = pair.split("=");
    if (key && value) cookieJar.set(key.trim(), value.trim());
  }
}

function cookieHeader() {
  if (!cookieJar.size) return "";
  return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function writeReport(name, data) {
  await fs.mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, name);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function request(pathname, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(cookieJar.size ? { Cookie: cookieHeader() } : {})
    }
  });
  storeCookies(res.headers.getSetCookie?.() || res.headers.get("set-cookie"));
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json ?? text };
}

async function run() {
  const health = await request("/api/health");
  await writeReport("health.json", health);

  if (email && password) {
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    await writeReport("login.json", login);
  }

  const me = await request("/api/auth/me");
  await writeReport("me.json", me);
  const workspaceId =
    me?.body?.workspaceId ||
    me?.body?.workspace?.id ||
    me?.body?.user?.workspaceId ||
    me?.body?.user?.workspace?.id ||
    null;

  if (workspaceId) {
    const ledger = await request(`/api/workspaces/${workspaceId}/audit/logs`);
    await writeReport("ledger.json", ledger);
  }

  const headers = {};
  if (approvalToken) headers["x-approval-token"] = approvalToken;
  const seed = await request("/api/demo/seed", {
    method: "POST",
    headers
  });
  await writeReport("demo-seed.json", seed);
}

run().catch(async (err) => {
  await writeReport("error.json", { error: String(err?.message || err) });
  process.exitCode = 1;
});
