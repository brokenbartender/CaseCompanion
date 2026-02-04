import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "../services/IngestionPipeline.js";

const workspaceId = process.env.WORKSPACE_ID || "";
const matterId = process.env.MATTER_ID || "";
const textDir = process.env.TEXT_DIR || "";
const authorityPattern = process.env.HIGH_AUTHORITY_PATTERN || "Police Report";

if (!workspaceId || !matterId || !textDir) {
  console.error("WORKSPACE_ID, MATTER_ID, and TEXT_DIR are required.");
  process.exit(1);
}

const pipeline = new IngestionPipeline();

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const dir = path.resolve(textDir);
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".txt")) continue;
    const fullPath = path.join(dir, file);
    const text = await fs.promises.readFile(fullPath, "utf-8");
    const existing = await prisma.exhibit.findFirst({ where: { workspaceId, matterId, filename: file } });
    if (existing) {
      console.log(`Skip existing exhibit: ${file}`);
      continue;
    }
    const buffer = Buffer.from(text, "utf-8");
    const storageKey = `${workspaceId}/text/${file}`;
    await storageService.upload(storageKey, buffer);

    const isHighAuthority = file.includes(authorityPattern);
    const exhibit = await prisma.exhibit.create({
      data: {
        workspaceId,
        matterId,
        filename: file,
        mimeType: "text/plain",
        storageKey,
        type: "PDF",
        integrityHash: sha256(buffer),
        triageJson: JSON.stringify({
          authority: isHighAuthority ? "HIGH" : "STANDARD",
          sourcePath: fullPath
        })
      }
    });

    await pipeline.ingestCapturedText(workspaceId, exhibit.id, text);
    console.log(`Ingested: ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
