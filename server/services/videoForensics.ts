import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { safeResolve } from "../pathUtils.js";
import { storageService, storageMode } from "../storageService.js";

type VideoForensicsStatus = {
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

async function writeStatus(exhibitId: string, status: VideoForensicsStatus) {
  const dir = getExhibitOutputDir(exhibitId);
  ensureDir(dir);
  const statusPath = safeResolve(dir, "status.json");
  await fs.promises.writeFile(statusPath, JSON.stringify(status, null, 2));
}

function readStatus(exhibitId: string): VideoForensicsStatus | null {
  const dir = getExhibitOutputDir(exhibitId);
  const statusPath = safeResolve(dir, "status.json");
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
        if (rel === "status.json") continue;
        const stats = await fs.promises.stat(fullPath);
        const sha = await sha256File(fullPath);
        const type = rel.startsWith("frames/") ? "frame"
          : rel.startsWith("audio/") ? "audio"
          : rel.startsWith("metadata/") ? "metadata"
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
  return ext || ".bin";
}

export async function processVideoForensics(args: {
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
  ensureDir(getArtifactPath(exhibitId, "frames"));
  ensureDir(getArtifactPath(exhibitId, "audio"));
  ensureDir(getArtifactPath(exhibitId, "logs"));

  await writeStatus(exhibitId, { exhibitId, status: "queued" });
  await logAuditEvent(workspaceId, userId, "VIDEO_FORENSICS_QUEUED", { exhibitId, storageKey }).catch(() => null);

  const startedAt = new Date().toISOString();
  await writeStatus(exhibitId, { exhibitId, status: "processing", startedAt });
  await logAuditEvent(workspaceId, userId, "VIDEO_FORENSICS_STARTED", { exhibitId, storageKey, startedAt }).catch(() => null);

  const originalExt = detectOriginalExtension(filename);
  const originalCopyPath = getArtifactPath(exhibitId, `source/original${originalExt}`);
  try {
    const buffer = await storageService.download(storageKey);
    await fs.promises.writeFile(originalCopyPath, buffer);
  } catch (err: any) {
    const error = err?.message || "Failed to download original";
    await writeStatus(exhibitId, { exhibitId, status: "error", startedAt, finishedAt: new Date().toISOString(), error });
    await logAuditEvent(workspaceId, userId, "VIDEO_FORENSICS_FAILED", { exhibitId, error }).catch(() => null);
    return;
  }

  const ffprobeJson = getArtifactPath(exhibitId, "metadata/ffprobe.json");
  const mediainfoJson = getArtifactPath(exhibitId, "metadata/mediainfo.json");
  const exiftoolJson = getArtifactPath(exhibitId, "metadata/exiftool.json");
  const audioPath = getArtifactPath(exhibitId, "audio/audio.wav");
  const framesDir = getArtifactPath(exhibitId, "frames");
  const logDir = getArtifactPath(exhibitId, "logs");

  const ffprobe = await runCommand(
    "ffprobe",
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", originalCopyPath],
    outputDir,
    safeResolve(logDir, "ffprobe.txt")
  );

  const mediainfo = await runCommand(
    "mediainfo",
    ["--Output=JSON", originalCopyPath],
    outputDir,
    safeResolve(logDir, "mediainfo.txt")
  );

  const exiftool = await runCommand(
    "exiftool",
    ["-json", originalCopyPath],
    outputDir,
    safeResolve(logDir, "exiftool.txt")
  );

  if (ffprobe.code === 0) {
    await fs.promises.writeFile(ffprobeJson, ffprobe.stdout).catch(() => null);
  }
  if (mediainfo.code === 0) {
    await fs.promises.writeFile(mediainfoJson, mediainfo.stdout).catch(() => null);
  }
  if (exiftool.code === 0) {
    await fs.promises.writeFile(exiftoolJson, exiftool.stdout).catch(() => null);
  }

  await runCommand(
    "ffmpeg",
    ["-y", "-i", originalCopyPath, "-vn", "-ac", "1", "-ar", "16000", audioPath],
    outputDir,
    safeResolve(logDir, "ffmpeg_audio.txt")
  );

  await runCommand(
    "ffmpeg",
    ["-y", "-i", originalCopyPath, "-vf", "fps=1", "-frames:v", "60", path.join(framesDir, "frame_%04d.jpg")],
    outputDir,
    safeResolve(logDir, "ffmpeg_frames.txt")
  );

  const artifacts = await collectArtifacts(exhibitId);
  await writeManifest(exhibitId, artifacts);

  const finishedAt = new Date().toISOString();
  await writeStatus(exhibitId, { exhibitId, status: "complete", startedAt, finishedAt, artifacts });
  await logAuditEvent(workspaceId, userId, "VIDEO_FORENSICS_COMPLETE", {
    exhibitId,
    storageKey,
    artifactCount: artifacts.length,
    storageMode
  }).catch(() => null);
}

export async function getVideoForensicsStatus(exhibitId: string): Promise<VideoForensicsStatus> {
  const status = readStatus(exhibitId);
  if (status) return status;
  return { exhibitId, status: "not_applicable" };
}

export async function listVideoForensicsArtifacts(exhibitId: string) {
  const dir = getExhibitOutputDir(exhibitId);
  if (!fs.existsSync(dir)) return [];
  const status = readStatus(exhibitId);
  if (status?.artifacts?.length) return status.artifacts;
  return collectArtifacts(exhibitId);
}

export function streamVideoArtifact(exhibitId: string, artifactId: string) {
  const filePath = getArtifactPath(exhibitId, artifactId);
  if (!fs.existsSync(filePath)) {
    const err: any = new Error("Artifact not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  return filePath;
}
