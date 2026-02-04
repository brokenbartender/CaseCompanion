import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { evidenceProcessor } from "./evidenceProcessor.js";
import { metadataExtractor } from "./metadataExtractor.js";
import { VectorStorageService } from "./VectorStorageService.js";
import { extractDeadlines } from "./deadlineService.js";
import { mediaIngestionService } from "./mediaIngestionService.js";

type Chunk = {
  text: string;
  pageNumber: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractMetadata(text: string) {
  const dates = Array.from(
    new Set((text.match(/\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g) || []))
  ).slice(0, 25);
  const amounts = Array.from(new Set((text.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || []))).slice(0, 25);
  const entities = Array.from(
    new Set((text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || []))
  ).slice(0, 25);
  return { dates, amounts, entities };
}

function buildChunkMetadata(chunk: Chunk, ingestionTimestamp: string) {
  const extracted = extractMetadata(chunk.text);
  return {
    source_id: '',
    page_num: chunk.pageNumber,
    ingestion_timestamp: ingestionTimestamp,
    extracted
  };
}
function splitText(text: string, chunkSize = 1200, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    chunks.push(text.slice(start, end));
    start = Math.max(end - overlap, end);
  }
  return chunks.filter((chunk) => chunk.trim().length > 0);
}

function resolvePageNumber(offset: number, pageMap: number[]): number {
  if (!pageMap.length) return 1;
  let page = 1;
  for (let i = 0; i < pageMap.length; i += 1) {
    if (offset >= pageMap[i]) {
      page = i + 1;
    } else {
      break;
    }
  }
  return page;
}

export class IngestionPipeline {
  private vectorStore: VectorStorageService;

  constructor(vectorStore = new VectorStorageService()) {
    this.vectorStore = vectorStore;
  }

  private resolveWorkspaceSecret(workspaceId: string) {
    const seed = String(process.env.GENESIS_SEED || "GENESIS");
    return crypto.createHash("sha256").update(`${workspaceId}:${seed}`).digest("hex");
  }

  async ingestCapturedText(workspaceId: string, exhibitId: string, text: string) {
    const exhibit = await prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId },
      select: {
        id: true,
        filename: true,
        storageKey: true,
        batesNumber: true,
        matterId: true,
        documentType: true,
        privilegePending: true,
        redactionStatus: true
      }
    });
    if (!exhibit || !exhibit.storageKey || !exhibit.matterId) {
      throw new Error("Exhibit not found or missing storage key/matter ID.");
    }
    if (String(exhibit.documentType || "").toUpperCase() === "PRIVILEGED" || exhibit.privilegePending) {
      return;
    }
    if (['APPLIED', 'PENDING'].includes(String(exhibit.redactionStatus || "").toUpperCase())) {
      return;
    }

    const rawChunks = splitText(text || "");
    const chunks: Chunk[] = rawChunks.map((chunk) => ({
      text: chunk,
      pageNumber: 1
    }));
    const ingestionTimestamp = new Date().toISOString();
    await prisma.exhibit.update({
      where: { id: exhibit.id },
      data: {
        triageJson: JSON.stringify({
          ocrStatus: "COMPLETED",
          extractedText: String(text || "").slice(0, 5000),
          extractedAt: ingestionTimestamp
        })
      }
    });

    const workspaceSecret = this.resolveWorkspaceSecret(workspaceId);
    const chunkRecords = chunks.map((chunk, idx) => ({
      id: `${exhibit.id}:${idx}`,
      exhibitId: exhibit.id,
      caseId: exhibit.matterId,
      batesNumber: exhibit.batesNumber || "",
      sourcePath: exhibit.storageKey,
      pageNumber: chunk.pageNumber,
      chunkIndex: idx,
      text: chunk.text,
      metadataJson: JSON.stringify({
        ...buildChunkMetadata(chunk, ingestionTimestamp),
        source_id: exhibit.id,
        privileged: false,
        redactionStatus: exhibit.redactionStatus || "NONE"
      })
    }));

    await this.vectorStore.addRecords(workspaceId, workspaceSecret, exhibit.matterId, chunkRecords);

    const deadlines = [];
    const baseDate = new Date();
    for (const record of chunkRecords) {
      const found = await extractDeadlines(record.text, record.id, baseDate);
      deadlines.push(...found);
    }

    if (deadlines.length) {
      try {
        await prisma.deadline.createMany({
          data: deadlines.map((deadline) => ({
            workspaceId,
            matterId: exhibit.matterId,
            exhibitId: exhibit.id,
            title: deadline.title,
            dueDate: deadline.dueDate,
            sourceText: deadline.sourceText,
            sourceChunkId: deadline.sourceChunkId,
            status: "DETECTED",
            confidence: deadline.confidence
          }))
        });
      } catch (err: any) {
        console.error("Deadline extraction failed:", err?.message || err);
      }
    }

    void metadataExtractor.extract(text || "", exhibit.matterId ?? "");
  }

  async ingestExhibit(workspaceId: string, exhibitId: string) {
    const exhibit = await prisma.exhibit.findFirst({
      where: { id: exhibitId, workspaceId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        storageKey: true,
        batesNumber: true,
        matterId: true,
        documentType: true,
        privilegePending: true,
        redactionStatus: true,
        redactedStorageKey: true
      }
    });
    if (!exhibit || !exhibit.storageKey || !exhibit.matterId) {
      throw new Error("Exhibit not found or missing storage key/matter ID.");
    }
    if (String(exhibit.documentType || "").toUpperCase() === "PRIVILEGED" || exhibit.privilegePending) {
      return;
    }

    if (['PENDING'].includes(String(exhibit.redactionStatus || "").toUpperCase())) {
      return;
    }
    if (String(exhibit.redactionStatus || "").toUpperCase() === "APPLIED" && !exhibit.redactedStorageKey) {
      return;
    }

    const storageKey = (String(exhibit.redactionStatus || "").toUpperCase() === "APPLIED" && exhibit.redactedStorageKey)
      ? exhibit.redactedStorageKey
      : exhibit.storageKey;
    const data = await storageService.download(storageKey);
    const mimeType = String(exhibit.mimeType || "").toLowerCase();
    if (mimeType.startsWith("video/") || mimeType.startsWith("audio/")) {
      const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lexipro-media-"));
      const tempPath = path.join(tempDir, exhibit.filename || `media-${exhibit.id}`);
      try {
        await fs.promises.writeFile(tempPath, data);
        await mediaIngestionService.ingestMedia(tempPath, exhibit.id, mimeType);
      } finally {
        await fs.promises.unlink(tempPath).catch(() => null);
        await fs.promises.rmdir(tempDir).catch(() => null);
      }
      return;
    }
    if (mimeType.startsWith("image/")) {
      return;
    }

    await sleep(3000);
    const extracted = await this.processPDF(data, exhibit.filename);
    const rawChunks = splitText(extracted.text);

    let cursor = 0;
    const chunks: Chunk[] = [];
    for (const chunk of rawChunks) {
      const pageNumber = resolvePageNumber(cursor, extracted.pageMap);
      chunks.push({ text: chunk, pageNumber });
      cursor += chunk.length;
    }
    const ingestionTimestamp = new Date().toISOString();

    await prisma.exhibit.update({
      where: { id: exhibit.id },
      data: {
        triageJson: JSON.stringify({
          ocrStatus: "COMPLETED",
          extractedText: String(extracted.text || "").slice(0, 5000),
          extractedAt: ingestionTimestamp
        })
      }
    });

    const workspaceSecret = this.resolveWorkspaceSecret(workspaceId);
    const chunkRecords = chunks.map((chunk, idx) => ({
      id: `${exhibit.id}:${idx}`,
      exhibitId: exhibit.id,
      caseId: exhibit.matterId,
      batesNumber: exhibit.batesNumber || "",
      sourcePath: storageKey,
      pageNumber: chunk.pageNumber,
      chunkIndex: idx,
      text: chunk.text,
      metadataJson: JSON.stringify({
        ...buildChunkMetadata(chunk, ingestionTimestamp),
        source_id: exhibit.id,
        privileged: false,
        redactionStatus: exhibit.redactionStatus || "NONE"
      })
    }));

    await this.vectorStore.addRecords(workspaceId, workspaceSecret, exhibit.matterId, chunkRecords);

    const deadlines = [];
    const baseDate = new Date();
    for (const record of chunkRecords) {
      const found = await extractDeadlines(record.text, record.id, baseDate);
      deadlines.push(...found);
    }

    if (deadlines.length) {
      try {
        await prisma.deadline.createMany({
          data: deadlines.map((deadline) => ({
            workspaceId,
            matterId: exhibit.matterId,
            exhibitId: exhibit.id,
            title: deadline.title,
            dueDate: deadline.dueDate,
            sourceText: deadline.sourceText,
            sourceChunkId: deadline.sourceChunkId,
            status: "DETECTED",
            confidence: deadline.confidence
          }))
        });
      } catch (err: any) {
        console.error("Deadline extraction failed:", err?.message || err);
      }
    }

    void metadataExtractor.extract(extracted.text ?? "", exhibit.matterId ?? "");

  }

  private async processPDF(buffer: Buffer, filename?: string) {
    const extracted = await evidenceProcessor.extractTextFromBuffer(buffer, filename ?? "document.pdf");
    return extracted;
  }

  async queryCaseMemory(workspaceId: string, caseId: string, prompt: string, topK = 5) {
    const workspaceSecret = this.resolveWorkspaceSecret(workspaceId);
    return this.vectorStore.queryCaseMemory(prompt, workspaceId, workspaceSecret, caseId, topK);
  }
}
