import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { safeResolve } from "../pathUtils.js";
import { storageService, storageMode } from "../storageService.js";

type PdfForensicsStatus = {
  exhibitId: string;
  status: "queued" | "processing" | "complete" | "error" | "not_applicable";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  artifacts?: Array<{
    id: string;
    type: string;
    path: string;
    sha256: string;
    size: number;
  }>;
  pageCount?: number;
  renderedPages?: number;
};

type ArtifactEntry = {
  id: string;
  type: string;
  path: string;
  sha256: string;
  size: number;
};

const OUTPUTS_DIR = (() => {
  const cwd = process.cwd();
  const primary = path.resolve(cwd, "outputs");
  const fallback = path.resolve(cwd, "server", "outputs");
  if (fs.existsSync(primary)) return primary;
  return fallback;
})();

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function writeStatus(exhibitId: string, status: PdfForensicsStatus) {
  const dir = getExhibitOutputDir(exhibitId);
  ensureDir(dir);
  const statusPath = safeResolve(dir, "pdf_status.json");
  await fs.promises.writeFile(statusPath, JSON.stringify(status, null, 2));
}

function readStatus(exhibitId: string): PdfForensicsStatus | null {
  const dir = getExhibitOutputDir(exhibitId);
  const statusPath = safeResolve(dir, "pdf_status.json");
  if (!fs.existsSync(statusPath)) return null;
  const raw = fs.readFileSync(statusPath, "utf-8");
  return JSON.parse(raw);
}

function getExhibitOutputDir(exhibitId: string) {
  const base = OUTPUTS_DIR;
  ensureDir(base);
  return safeResolve(base, exhibitId);
}

function getArtifactPath(exhibitId: string, relativePath: string) {
  const base = getExhibitOutputDir(exhibitId);
  return safeResolve(base, relativePath);
}

async function runCommand(cmd: string, args: string[], cwd: string, logPath: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    const out: string[] = [];
    const err: string[] = [];
    const child = spawn(cmd, args, { cwd });
    child.stdout.on("data", (data) => out.push(String(data)));
    child.stderr.on("data", (data) => err.push(String(data)));
    child.on("close", (code) => {
      const payload = [
        `# ${cmd} ${args.join(" ")}`,
        "",
        ...out,
        "",
        ...err
      ].join("");
      fs.writeFileSync(logPath, payload);
      resolve({ code: code ?? 1, stdout: out.join(""), stderr: err.join("") });
    });
    child.on("error", () => resolve({ code: 1, stdout: "", stderr: "spawn_error" }));
  });
}

function resolveTool(name: string) {
  const envBin = String(process.env.POPPLER_BIN || "").trim();
  const wingetBin = (() => {
    const localApp = String(process.env.LOCALAPPDATA || "").trim();
    if (!localApp) return null;
    const base = path.join(localApp, "Microsoft", "WinGet", "Packages");
    if (!fs.existsSync(base)) return null;
    const entries = fs.readdirSync(base, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("oschwartz10612.Poppler"))
      .map((entry) => entry.name);
    for (const entry of entries) {
      const root = path.join(base, entry);
      const children = fs.readdirSync(root, { withFileTypes: true })
        .filter((child) => child.isDirectory() && child.name.startsWith("poppler-"))
        .map((child) => child.name);
      for (const child of children) {
        const binPath = path.join(root, child, "Library", "bin");
        if (fs.existsSync(binPath)) return binPath;
      }
    }
    return null;
  })();
  const candidates = [
    envBin ? path.join(envBin, `${name}.exe`) : null,
    wingetBin ? path.join(wingetBin, `${name}.exe`) : null,
    `C:\\Program Files\\poppler\\Library\\bin\\${name}.exe`,
    `C:\\Program Files\\Poppler\\Library\\bin\\${name}.exe`,
    `C:\\Program Files\\poppler\\Library\\bin\\${name}`,
    `C:\\Program Files\\Git\\mingw64\\bin\\${name}.exe`
  ].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return name;
}

function parsePdfInfoPages(output: string) {
  const match = output.match(/Pages:\s+(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

async function collectArtifacts(exhibitId: string) {
  const dir = getExhibitOutputDir(exhibitId);
  const files: ArtifactEntry[] = [];
  const walk = async (root: string) => {
    const entries = await fs.promises.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
        if (rel === "pdf_status.json") continue;
        if (rel === "status.json") continue;
        const stats = await fs.promises.stat(fullPath);
        const sha = await sha256File(fullPath);
        const type = rel.startsWith("pages/") ? "pdf_page"
          : rel.startsWith("text/") ? "text"
          : rel.startsWith("metadata/") ? "metadata"
          : rel.startsWith("logs/") ? "log"
          : rel.startsWith("source/") ? "original_copy"
          : rel === "manifest.json" ? "manifest"
          : "artifact";
        files.push({
          id: rel,
          type,
          path: rel,
          sha256: sha,
          size: stats.size
        });
      }
    }
  };
  if (!fs.existsSync(dir)) return [];
  await walk(dir);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function writeManifest(exhibitId: string, artifacts: ArtifactEntry[]) {
  const dir = getExhibitOutputDir(exhibitId);
  const manifestPath = safeResolve(dir, "manifest.json");
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify(
      {
        exhibitId,
        createdAt: new Date().toISOString(),
        artifacts
      },
      null,
      2
    )
  );
}

function detectOriginalExtension(filename: string) {
  const ext = path.extname(filename || "");
  return ext || ".pdf";
}

export async function processPdfForensics(args: {
  exhibitId: string;
  workspaceId: string;
  userId: string;
  storageKey: string;
  filename: string;
  logAuditEvent: (workspaceId: string, userId: string, event: string, payload: any) => Promise<void>;
}) {
  const { exhibitId, workspaceId, userId, storageKey, filename, logAuditEvent } = args;
  const outputDir = getExhibitOutputDir(exhibitId);
  ensureDir(outputDir);
  ensureDir(getArtifactPath(exhibitId, "source"));
  ensureDir(getArtifactPath(exhibitId, "metadata"));
  ensureDir(getArtifactPath(exhibitId, "pages"));
  ensureDir(getArtifactPath(exhibitId, "text"));
  ensureDir(getArtifactPath(exhibitId, "logs"));

  await writeStatus(exhibitId, { exhibitId, status: "queued" });
  await logAuditEvent(workspaceId, userId, "PDF_FORENSICS_QUEUED", { exhibitId, storageKey }).catch(() => null);

  const startedAt = new Date().toISOString();
  await writeStatus(exhibitId, { exhibitId, status: "processing", startedAt });
  await logAuditEvent(workspaceId, userId, "PDF_FORENSICS_STARTED", { exhibitId, storageKey, startedAt }).catch(() => null);

  const originalExt = detectOriginalExtension(filename);
  const originalCopyPath = getArtifactPath(exhibitId, `source/original${originalExt}`);
  try {
    const buffer = await storageService.download(storageKey);
    await fs.promises.writeFile(originalCopyPath, buffer);
  } catch (err: any) {
    const error = err?.message || "Failed to download original";
    await writeStatus(exhibitId, { exhibitId, status: "error", startedAt, finishedAt: new Date().toISOString(), error });
    await logAuditEvent(workspaceId, userId, "PDF_FORENSICS_FAILED", { exhibitId, error }).catch(() => null);
    return;
  }

  const logDir = getArtifactPath(exhibitId, "logs");
  const pdfinfo = await runCommand(
    resolveTool("pdfinfo"),
    [originalCopyPath],
    outputDir,
    safeResolve(logDir, "pdfinfo.txt")
  );
  if (pdfinfo.code === 0) {
    await fs.promises.writeFile(getArtifactPath(exhibitId, "metadata/pdfinfo.txt"), pdfinfo.stdout).catch(() => null);
  }

  const pageCount = parsePdfInfoPages(pdfinfo.stdout || "");
  const maxPages = Number(process.env.PDF_RENDER_MAX_PAGES || 30);
  const renderPages = pageCount ? Math.min(pageCount, maxPages) : maxPages;

  await runCommand(
    resolveTool("pdftotext"),
    ["-layout", "-enc", "UTF-8", originalCopyPath, getArtifactPath(exhibitId, "text/extracted.txt")],
    outputDir,
    safeResolve(logDir, "pdftotext.txt")
  );

  await runCommand(
    resolveTool("pdftoppm"),
    ["-png", "-r", "150", "-f", "1", "-l", String(renderPages), originalCopyPath, getArtifactPath(exhibitId, "pages/page")],
    outputDir,
    safeResolve(logDir, "pdftoppm.txt")
  );

  const artifacts = await collectArtifacts(exhibitId);
  await writeManifest(exhibitId, artifacts);

  const finishedAt = new Date().toISOString();
  await writeStatus(exhibitId, {
    exhibitId,
    status: "complete",
    startedAt,
    finishedAt,
    artifacts,
    pageCount: pageCount ?? undefined,
    renderedPages: renderPages
  });
  await logAuditEvent(workspaceId, userId, "PDF_FORENSICS_COMPLETE", {
    exhibitId,
    storageKey,
    artifactCount: artifacts.length,
    storageMode,
    pageCount: pageCount ?? null,
    renderedPages: renderPages
  }).catch(() => null);
}

export async function getPdfForensicsStatus(exhibitId: string): Promise<PdfForensicsStatus> {
  const status = readStatus(exhibitId);
  if (status) return status;
  return { exhibitId, status: "not_applicable" };
}

export async function listPdfForensicsArtifacts(exhibitId: string) {
  const dir = getExhibitOutputDir(exhibitId);
  if (!fs.existsSync(dir)) return [];
  const status = readStatus(exhibitId);
  if (status?.artifacts?.length) return status.artifacts;
  return collectArtifacts(exhibitId);
}

export function streamPdfArtifact(exhibitId: string, artifactId: string) {
  const filePath = getArtifactPath(exhibitId, artifactId);
  if (!fs.existsSync(filePath)) {
    const err: any = new Error("Artifact not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  return filePath;
}
