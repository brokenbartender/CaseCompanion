import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
const email = process.env.SMOKE_EMAIL || "";
const password = process.env.SMOKE_PASSWORD || "";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve("..", "reports", "demo-evidence");

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

async function request(pathname, options = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(cookieJar.size ? { Cookie: cookieHeader() } : {})
    }
  });
  storeCookies(res.headers.getSetCookie?.() || res.headers.get("set-cookie"));
  return res;
}

async function run() {
  if (email && password) {
    await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  }

  const meRes = await request("/api/auth/me");
  const meText = await meRes.text().catch(() => "");
  const me = meText ? JSON.parse(meText) : null;
  const workspaceId =
    me?.workspaceId ||
    me?.workspace?.id ||
    me?.user?.workspaceId ||
    me?.user?.workspace?.id ||
    null;
  if (!workspaceId) {
    throw new Error("Workspace missing. Sign in and retry.");
  }

  const exhibitsRes = await request(`/api/workspaces/${workspaceId}/exhibits`);
  const exhibitsText = await exhibitsRes.text().catch(() => "");
  const exhibits = exhibitsText ? JSON.parse(exhibitsText) : [];
  const target = Array.isArray(exhibits) && exhibits.length ? exhibits[0] : null;
  if (!target?.id) {
    throw new Error("No exhibits found to export.");
  }

  const exportRes = await request(`/api/exhibits/${target.id}/package`, {
    headers: { "x-workspace-id": workspaceId }
  });
  if (!exportRes.ok) {
    const text = await exportRes.text().catch(() => "");
    throw new Error(text || `Export failed (${exportRes.status})`);
  }

  const buffer = Buffer.from(await exportRes.arrayBuffer());
  const zip = new AdmZip(buffer);
  const manifestEntry = zip.getEntry("chain_of_custody.json");
  const sigEntry = zip.getEntry("manifest.sig");
  if (!manifestEntry) {
    throw new Error("Manifest not found in export package.");
  }

  const manifestJson = manifestEntry.getData().toString("utf-8");
  const manifest = JSON.parse(manifestJson);
  const signature = sigEntry ? JSON.parse(sigEntry.getData().toString("utf-8")) : null;

  const output = {
    capturedAt: new Date().toISOString(),
    workspaceId,
    exhibitId: target.id,
    manifest,
    signature
  };

  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `export-metadata-${timestamp}.json`);
  await fs.writeFile(outPath, JSON.stringify(output, null, 2));
}

run().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
