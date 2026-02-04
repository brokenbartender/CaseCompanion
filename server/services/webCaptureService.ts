import crypto from "crypto";
import path from "path";
import dns from "dns/promises";
import net from "net";
import { chromium } from "playwright";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "./IngestionPipeline.js";

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sanitizeFilename(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_\.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-\.]+|[-\.]+$/g, "");
}

const WEB_CAPTURE_ALLOW_HOSTS = String(process.env.WEB_CAPTURE_ALLOW_HOSTS || "").trim();
const WEB_CAPTURE_MAX_TEXT_CHARS = Number(process.env.WEB_CAPTURE_MAX_TEXT_CHARS || 200000);
const WEB_CAPTURE_NAV_TIMEOUT_MS = Number(process.env.WEB_CAPTURE_NAV_TIMEOUT_MS || 30000);

const isPrivateIp = (ip: string) => {
  if (!net.isIP(ip)) return false;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1] || 0);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fe80:")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
};

const isHostnameAllowed = (hostname: string) => {
  if (!WEB_CAPTURE_ALLOW_HOSTS) return true;
  const allowed = WEB_CAPTURE_ALLOW_HOSTS.split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.some((entry) => {
    if (entry.startsWith(".")) {
      return hostname.endsWith(entry);
    }
    return hostname === entry;
  });
};

async function assertSafeUrl(targetUrl: string) {
  const parsed = new URL(targetUrl);
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Localhost captures are not permitted.");
  }
  if (!isHostnameAllowed(hostname)) {
    throw new Error("Host is not on the web capture allowlist.");
  }
  const lookups = await dns.lookup(hostname, { all: true }).catch(() => []);
  for (const record of lookups) {
    if (isPrivateIp(record.address)) {
      throw new Error("Private network targets are not permitted.");
    }
  }
}

export const webCaptureService = {
  async captureUrl(url: string, workspaceId: string, matterId: string) {
    const parsed = new URL(url);
    await assertSafeUrl(url);

    const matter = await prisma.matter.findFirst({
      where: { id: matterId, workspaceId },
      select: { id: true, slug: true }
    });
    if (!matter) {
      throw new Error("Matter not found for workspace.");
    }

    await prisma.$executeRawUnsafe(`ALTER TYPE "ExhibitType" ADD VALUE IF NOT EXISTS 'WEB_CAPTURE'`);

    const browser = await chromium.launch({ headless: true });
    let screenshot: Buffer;
    let textContent = "";
    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(WEB_CAPTURE_NAV_TIMEOUT_MS);
      await page.goto(url, { waitUntil: "networkidle", timeout: WEB_CAPTURE_NAV_TIMEOUT_MS });
      screenshot = (await page.screenshot({ fullPage: true, type: "png" })) as Buffer;
      textContent = await page.evaluate(() => document.body?.innerText || "");
      if (WEB_CAPTURE_MAX_TEXT_CHARS > 0 && textContent.length > WEB_CAPTURE_MAX_TEXT_CHARS) {
        textContent = textContent.slice(0, WEB_CAPTURE_MAX_TEXT_CHARS);
      }
      await page.close();
    } finally {
      await browser.close();
    }

    const imageHash = sha256(screenshot);
    const textHash = sha256(textContent);
    const hostname = sanitizeFilename(parsed.hostname || "web");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `web-capture-${hostname}-${timestamp}.png`;
    const storageKey = path.posix.join(workspaceId, matter.slug, filename);
    await storageService.upload(storageKey, screenshot);

    const metadata = {
      url,
      capturedAt: new Date().toISOString(),
      imageSha256: imageHash,
      textSha256: textHash,
      textLength: textContent.length,
      imageBytes: screenshot.length
    };

    const exhibit = await prisma.exhibit.create({
      data: {
        workspaceId,
        matterId: matter.id,
        filename,
        mimeType: "image/png",
        storageKey,
        integrityHash: imageHash,
        type: "WEB_CAPTURE",
        mediaMetadataJson: JSON.stringify(metadata)
      }
    });

    const ingestion = new IngestionPipeline();
    await ingestion.ingestCapturedText(workspaceId, exhibit.id, textContent);

    return {
      exhibitId: exhibit.id,
      storageKey,
      imageHash,
      textHash,
      textLength: textContent.length
    };
  }
};
