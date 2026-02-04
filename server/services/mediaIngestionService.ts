import crypto from "crypto";
import { Prisma } from "@prisma/client";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { VectorStorageService } from "./VectorStorageService.js";

type Segment = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function mockTranscript(): Segment[] {
  return [
    { start: 10.0, end: 15.0, text: "I admit I was speeding." },
    { start: 20.0, end: 25.0, text: "The light was red." }
  ];
}

export const mediaIngestionService = {
  async ingestMedia(filePath: string, exhibitId: string, mimeType: string) {
    const buffer = await fs.promises.readFile(filePath);
    const hash = sha256(buffer);
    const metadata = {
      sha256: hash,
      sizeBytes: buffer.length
    };

    const exhibit = await prisma.exhibit.findFirst({
      where: { id: exhibitId },
      select: { id: true, documentType: true, privilegePending: true, redactionStatus: true }
    });
    if (exhibit) {
      if (String(exhibit.documentType || "").toUpperCase() === "PRIVILEGED" || exhibit.privilegePending) {
        return { segmentCount: 0, hash, skipped: true };
      }
      if (['APPLIED', 'PENDING'].includes(String(exhibit.redactionStatus || "").toUpperCase())) {
        return { segmentCount: 0, hash, skipped: true };
      }
    }

    const normalizedMime = String(mimeType || "").toLowerCase();
    const isVideo = normalizedMime.startsWith("video/");
    const isAudio = normalizedMime.startsWith("audio/");
    if (!isVideo && !isAudio) {
      throw new Error(`Unsupported media type: ${mimeType}`);
    }

    await prisma.exhibit.update({
      where: { id: exhibitId },
      data: {
        type: isVideo ? "VIDEO" : "AUDIO",
        mediaMetadataJson: JSON.stringify(metadata)
      }
    });

    const segments = mockTranscript();
    const vectorStore = new VectorStorageService();
    const vectorEnabled = vectorStore.isVectorEnabled();

    for (const segment of segments) {
      if (vectorEnabled) {
        const embedding = await vectorStore.embedText(segment.text);
        const vectorLiteral = `[${embedding.join(",")}]`;
        await prisma.$executeRaw`
          INSERT INTO "TranscriptSegment"
            ("id", "exhibitId", "startTime", "endTime", "text", "speaker", "embedding", "createdAt")
          VALUES
            (${crypto.randomUUID()}, ${exhibitId}, ${segment.start}, ${segment.end}, ${segment.text}, ${segment.speaker || null}, ${vectorLiteral}::vector, CURRENT_TIMESTAMP)
        `;
        continue;
      }
      await prisma.transcriptSegment.create({
        data: {
          id: crypto.randomUUID(),
          exhibitId,
          startTime: segment.start,
          endTime: segment.end,
          text: segment.text,
          speaker: segment.speaker || null,
          embedding: Prisma.JsonNull
        }
      });
    }

    return { segmentCount: segments.length, hash };
  }
};
