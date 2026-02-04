import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type VectorRecord = {
  id: string;
  caseId: string;
  exhibitId: string;
  batesNumber: string;
  sourcePath: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  embedding: number[];
  metadataJson?: string | null;
};

export type VectorQueryResult = {
  id: string;
  exhibitId: string;
  batesNumber: string;
  sourcePath: string;
  pageNumber: number;
  text: string;
  score: number;
  lowConfidence?: boolean;
};

export type TranscriptQueryResult = {
  id: string;
  exhibitId: string;
  startTime: number;
  endTime: number;
  text: string;
  score: number;
  lowConfidence?: boolean;
};

export type OmniContextItem = {
  id: string;
  exhibitId: string;
  text: string;
  score: number;
  type: "DOCUMENT" | "MEDIA";
  pageNumber?: number;
  batesNumber?: string;
  sourcePath?: string;
  startTime?: number;
  endTime?: number;
  lowConfidence?: boolean;
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "all-minilm-l6-v2";
const OLLAMA_EMBED_DIM = Number(process.env.OLLAMA_EMBED_DIM || 768);
const CONFIDENCE_THRESHOLD = 0.85;
const VECTOR_STORAGE_DISABLED =
  process.env.VECTOR_STORAGE_DISABLED === "true" ||
  (process.env.RENDER === "true" && process.env.VECTOR_STORAGE_ENABLED !== "true");

export class VectorStorageService {
  private embeddingDimension = Number.isFinite(OLLAMA_EMBED_DIM) && OLLAMA_EMBED_DIM > 0 ? OLLAMA_EMBED_DIM : 384;
  private vectorEnabled = !VECTOR_STORAGE_DISABLED;

  isVectorEnabled() {
    return this.vectorEnabled;
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.vectorEnabled) {
      throw new Error("Vector storage disabled");
    }
    const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text })
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      throw new Error(raw || `Embedding error ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    const embedding = (data as any)?.embedding;
    if (!Array.isArray(embedding)) {
      throw new Error("Embedding response missing vector");
    }
    const vector = embedding.map((v: any) => Number(v));
    if (vector.length !== this.embeddingDimension) {
      throw new Error(`Embedding dimension mismatch: expected ${this.embeddingDimension}, got ${vector.length}`);
    }
    return vector;
  }

  async addRecords(workspaceId: string, workspaceSecret: string, caseId: string, records: Omit<VectorRecord, "embedding">[]) {
    if (!records.length) return;
    if (!this.vectorEnabled) {
      await prisma.documentChunk.createMany({
        data: records.map((record) => ({
          id: record.id,
          workspaceId,
          matterId: record.caseId,
          exhibitId: record.exhibitId,
          batesNumber: record.batesNumber || null,
          sourcePath: record.sourcePath,
          pageNumber: record.pageNumber,
          chunkIndex: record.chunkIndex,
          text: record.text,
          metadataJson: record.metadataJson || null,
          embedding: Prisma.JsonNull
        })),
        skipDuplicates: true
      });
      return;
    }
    for (const record of records) {
      const embedding = await this.embedText(record.text);
      const vectorLiteral = `[${embedding.join(",")}]`;
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk"
          ("id", "workspaceId", "matterId", "exhibitId", "batesNumber", "sourcePath", "pageNumber", "chunkIndex", "text", "metadataJson", "embedding", "createdAt", "updatedAt")
        VALUES
          (${record.id}, ${workspaceId}, ${record.caseId}, ${record.exhibitId}, ${record.batesNumber || null}, ${record.sourcePath}, ${record.pageNumber}, ${record.chunkIndex}, ${record.text}, ${record.metadataJson || null}, ${vectorLiteral}::vector, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO NOTHING
      `;
    }
  }

  async queryCaseMemory(
    prompt: string,
    workspaceId: string,
    workspaceSecret: string,
    caseId: string,
    topK = 5
  ): Promise<VectorQueryResult[]> {
    const limit = Math.max(1, Math.min(topK, 50));
    if (!this.vectorEnabled) {
      if (!prompt.trim()) return [];
      const rows = await prisma.documentChunk.findMany({
        where: {
          workspaceId,
          matterId: caseId,
          text: { contains: prompt, mode: "insensitive" },
          exhibit: {
            documentType: { not: "PRIVILEGED" },
            privilegePending: false,
            redactionStatus: "NONE"
          }
        },
        take: limit
      });
      return rows.map((row) => ({
        id: row.id,
        exhibitId: row.exhibitId,
        batesNumber: row.batesNumber || "",
        sourcePath: row.sourcePath,
        pageNumber: row.pageNumber,
        text: row.text,
        score: 0.2,
        lowConfidence: true
      }));
    }
    const queryEmbedding = await this.embedText(prompt);
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      exhibitId: string;
      batesNumber: string | null;
      sourcePath: string;
      pageNumber: number;
      text: string;
      score: number | null;
    }>>`
      SELECT
        "id",
        "exhibitId",
        "batesNumber",
        "sourcePath",
        "pageNumber",
        "text",
        1 - ("embedding" <=> ${vectorLiteral}::vector) AS score
      FROM "DocumentChunk"
      WHERE "workspaceId" = ${workspaceId}
        AND "matterId" = ${caseId}
        AND "exhibitId" IN (
          SELECT e."id"
          FROM "Exhibit" e
          WHERE e."documentType" <> 'PRIVILEGED'
            AND e."privilegePending" = false
            AND e."redactionStatus" = 'NONE'
        )
      ORDER BY "embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
    return rows.map((row: any) => ({
      id: row.id,
      exhibitId: row.exhibitId,
      batesNumber: row.batesNumber || "",
      sourcePath: row.sourcePath,
      pageNumber: row.pageNumber,
      text: row.text,
      score: typeof row.score === "number" ? row.score : 0,
      lowConfidence: typeof row.score === "number" ? row.score < CONFIDENCE_THRESHOLD : true
    }));
  }

  async queryTranscriptSegments(
    prompt: string,
    exhibitId: string,
    topK = 5
  ): Promise<TranscriptQueryResult[]> {
    const limit = Math.max(1, Math.min(topK, 50));
    const exhibit = await prisma.exhibit.findFirst({
      where: { id: exhibitId },
      select: { documentType: true, privilegePending: true, redactionStatus: true }
    });
    if (exhibit) {
      if (String(exhibit.documentType || "").toUpperCase() === "PRIVILEGED" || exhibit.privilegePending) {
        return [];
      }
      if (['APPLIED', 'PENDING'].includes(String(exhibit.redactionStatus || "").toUpperCase())) {
        return [];
      }
    }
    if (!this.vectorEnabled) {
      if (!prompt.trim()) return [];
      const rows = await prisma.transcriptSegment.findMany({
        where: {
          exhibitId,
          text: { contains: prompt, mode: "insensitive" }
        },
        take: limit
      });
      return rows.map((row) => ({
        id: row.id,
        exhibitId: row.exhibitId,
        startTime: Number(row.startTime),
        endTime: Number(row.endTime),
        text: row.text,
        score: 0.2,
        lowConfidence: true
      }));
    }
    const queryEmbedding = await this.embedText(prompt);
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      exhibitId: string;
      startTime: number;
      endTime: number;
      text: string;
      score: number | null;
    }>>`
      SELECT
        "id",
        "exhibitId",
        "startTime",
        "endTime",
        "text",
        1 - ("embedding" <=> ${vectorLiteral}::vector) AS score
      FROM "TranscriptSegment"
      WHERE "exhibitId" = ${exhibitId}
      ORDER BY "embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;
    return rows.map((row: any) => ({
      id: row.id,
      exhibitId: row.exhibitId,
      startTime: Number(row.startTime),
      endTime: Number(row.endTime),
      text: row.text,
      score: typeof row.score === "number" ? row.score : 0,
      lowConfidence: typeof row.score === "number" ? row.score < CONFIDENCE_THRESHOLD : true
    }));
  }

  async queryOmniMemory(
    prompt: string,
    workspaceId: string,
    matterId: string,
    topK = 12
  ): Promise<OmniContextItem[]> {
    const limit = Math.max(1, Math.min(topK, 50));
    if (!this.vectorEnabled) {
      if (!prompt.trim()) return [];
      const [docRows, mediaRows] = await Promise.all([
        prisma.documentChunk.findMany({
          where: {
            workspaceId,
            matterId,
            text: { contains: prompt, mode: "insensitive" },
            exhibit: {
              documentType: { not: "PRIVILEGED" },
              privilegePending: false,
              redactionStatus: "NONE"
            }
          },
          take: limit
        }),
        prisma.transcriptSegment.findMany({
          where: {
            exhibit: { workspaceId, matterId },
            text: { contains: prompt, mode: "insensitive" }
          },
          take: limit
        })
      ]);
      const docs: OmniContextItem[] = docRows.map((row) => ({
        id: row.id,
        exhibitId: row.exhibitId,
        text: row.text,
        score: 0.2,
        type: "DOCUMENT",
        pageNumber: row.pageNumber,
        batesNumber: row.batesNumber || "",
        sourcePath: row.sourcePath,
        lowConfidence: true
      }));
      const media: OmniContextItem[] = mediaRows.map((row) => ({
        id: row.id,
        exhibitId: row.exhibitId,
        text: row.text,
        score: 0.2,
        type: "MEDIA",
        startTime: Number(row.startTime),
        endTime: Number(row.endTime),
        lowConfidence: true
      }));
      return [...docs, ...media];
    }
    const queryEmbedding = await this.embedText(prompt);
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    const normalizeScore = (score: number | null) => {
      const raw = typeof score === "number" ? score : 0;
      return Math.max(0, Math.min(1, raw));
    };

    const [docRows, mediaRows] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string;
        exhibitId: string;
        batesNumber: string | null;
        sourcePath: string;
        pageNumber: number;
        text: string;
        score: number | null;
      }>>`
        SELECT
          "id",
          "exhibitId",
          "batesNumber",
          "sourcePath",
          "pageNumber",
          "text",
          1 - ("embedding" <=> ${vectorLiteral}::vector) AS score
        FROM "DocumentChunk"
        WHERE "workspaceId" = ${workspaceId}
          AND "matterId" = ${matterId}
          AND "exhibitId" IN (
            SELECT e."id"
            FROM "Exhibit" e
            WHERE e."documentType" <> 'PRIVILEGED'
              AND e."privilegePending" = false
              AND e."redactionStatus" = 'NONE'
          )
        ORDER BY "embedding" <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `,
      prisma.$queryRaw<Array<{
        id: string;
        exhibitId: string;
        startTime: number;
        endTime: number;
        text: string;
        score: number | null;
      }>>`
        SELECT
          t."id",
          t."exhibitId",
          t."startTime",
          t."endTime",
          t."text",
          1 - (t."embedding" <=> ${vectorLiteral}::vector) AS score
        FROM "TranscriptSegment" t
        INNER JOIN "Exhibit" e ON e."id" = t."exhibitId"
        WHERE e."workspaceId" = ${workspaceId}
          AND e."matterId" = ${matterId}
          AND e."documentType" <> 'PRIVILEGED'
          AND e."privilegePending" = false
          AND e."redactionStatus" = 'NONE'
        ORDER BY t."embedding" <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `
    ]);

    const docs: OmniContextItem[] = docRows.map((row: any) => ({
      id: row.id,
      exhibitId: row.exhibitId,
      text: row.text,
      score: normalizeScore(row.score),
      type: "DOCUMENT",
      pageNumber: row.pageNumber,
      batesNumber: row.batesNumber || "",
      sourcePath: row.sourcePath,
      lowConfidence: normalizeScore(row.score) < CONFIDENCE_THRESHOLD
    }));

    const media: OmniContextItem[] = mediaRows.map((row: any) => ({
      id: row.id,
      exhibitId: row.exhibitId,
      text: row.text,
      score: normalizeScore(row.score),
      type: "MEDIA",
      startTime: Number(row.startTime),
      endTime: Number(row.endTime),
      lowConfidence: normalizeScore(row.score) < CONFIDENCE_THRESHOLD
    }));

    return [...docs, ...media].sort((a, b) => b.score - a.score);
  }
}
