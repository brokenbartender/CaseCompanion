import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { logAuditEvent } from "../audit.js";
import { IngestionPipeline } from "./IngestionPipeline.js";
import { evidenceProcessor } from "./evidenceProcessor.js";

const ingestionPipeline = new IngestionPipeline();

type RedactionResult = {
  exhibitId: string;
  filename?: string | null;
  status: "APPLIED" | "SKIPPED" | "FAILED";
  redactedStorageKey?: string | null;
  detail?: string | null;
};

class RedactionQueue {
  private queue: string[] = [];
  private processing = false;

  enqueue(jobId: string) {
    this.queue.push(jobId);
    void this.process();
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length) {
        const jobId = this.queue.shift();
        if (!jobId) continue;
        await this.runJob(jobId);
      }
    } finally {
      this.processing = false;
    }
  }

  private async runJob(jobId: string) {
    const job = await prisma.redactionJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    await prisma.redactionJob.update({
      where: { id: jobId },
      data: { startedAt: new Date(), status: "PENDING" }
    });

    const exhibitIds = safeParseJson<string[]>(job.exhibitIdsJson, []);
    const terms = safeParseJson<string[]>(job.termsJson, []).map((term) => String(term || "").toLowerCase()).filter(Boolean);
    const results: RedactionResult[] = [];

    for (const exhibitId of exhibitIds) {
      const exhibit = await prisma.exhibit.findFirst({
        where: {
          id: exhibitId,
          workspaceId: job.workspaceId,
          matterId: job.matterId,
          deletedAt: null
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          storageKey: true,
          redactionStatus: true
        }
      });

      if (!exhibit) {
        results.push({ exhibitId, status: "FAILED", detail: "Exhibit not found" });
        continue;
      }

      if (!String(exhibit.mimeType || "").includes("pdf")) {
        await prisma.exhibit.update({
          where: { id: exhibit.id },
          data: { redactionStatus: "NONE" }
        }).catch(() => null);
        results.push({ exhibitId, filename: exhibit.filename, status: "FAILED", detail: "Redaction supports PDF only" });
        continue;
      }

      try {
        const originalBytes = await storageService.download(exhibit.storageKey);
        if (terms.length) {
          const extracted = await evidenceProcessor.extractTextFromBuffer(
            originalBytes,
            exhibit.filename || "document.pdf"
          );
          const haystack = String(extracted.text || "").toLowerCase();
          const found = terms.some((term) => haystack.includes(term));
          if (!found) {
            await prisma.exhibit.update({
              where: { id: exhibit.id },
              data: { redactionStatus: "NONE" }
            }).catch(() => null);
            results.push({
              exhibitId: exhibit.id,
              filename: exhibit.filename,
              status: "SKIPPED",
              detail: "No redaction terms found"
            });
            continue;
          }
        }

        const redacted = await buildRedactedPdf(originalBytes);
        const storageKey = `redactions/${job.workspaceId}/${job.matterId}/${exhibit.id}-${Date.now()}.pdf`;
        await storageService.upload(storageKey, redacted);

        await prisma.exhibit.update({
          where: { id: exhibit.id },
          data: {
            redactionStatus: "APPLIED",
            redactedStorageKey: storageKey
          }
        });

        await prisma.anchor.deleteMany({ where: { exhibitId: exhibit.id } });
        await prisma.documentChunk.deleteMany({ where: { exhibitId: exhibit.id } });
        await prisma.transcriptSegment.deleteMany({ where: { exhibitId: exhibit.id } });
        await prisma.mediaFrame.deleteMany({ where: { exhibitId: exhibit.id } });

        await ingestionPipeline.ingestExhibit(job.workspaceId, exhibit.id).catch(() => null);

        results.push({
          exhibitId: exhibit.id,
          filename: exhibit.filename,
          status: "APPLIED",
          redactedStorageKey: storageKey
        });
      } catch (err: any) {
        await prisma.exhibit.update({
          where: { id: exhibit.id },
          data: { redactionStatus: "NONE" }
        }).catch(() => null);
        results.push({
          exhibitId: exhibit.id,
          filename: exhibit.filename,
          status: "FAILED",
          detail: err?.message || "Redaction failed"
        });
      }
    }

    await prisma.redactionJob.update({
      where: { id: jobId },
      data: {
        status: "APPLIED",
        resultsJson: JSON.stringify(results),
        completedAt: new Date()
      }
    });

    await logAuditEvent(job.workspaceId, job.createdByUserId || "system", "REDACTION_JOB_COMPLETED", {
      jobId,
      matterId: job.matterId,
      total: results.length,
      applied: results.filter((r) => r.status === "APPLIED").length,
      failed: results.filter((r) => r.status === "FAILED").length
    }).catch(() => null);
  }
}

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

async function buildRedactedPdf(bytes: Buffer) {
  const source = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.HelveticaBold);

  for (const page of source.getPages()) {
    const { width, height } = page.getSize();
    const newPage = output.addPage([width, height]);
    newPage.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0, 0, 0) });
    newPage.drawText("REDACTED", {
      x: width * 0.2,
      y: height / 2,
      size: Math.max(24, Math.min(width, height) / 12),
      font,
      color: rgb(1, 1, 1)
    });
  }

  const pdfBytes = await output.save();
  return Buffer.from(pdfBytes);
}

const redactionQueue = new RedactionQueue();

export function enqueueRedactionJob(jobId: string) {
  redactionQueue.enqueue(jobId);
}
