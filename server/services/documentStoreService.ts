import { sqltag as sql, empty } from "@prisma/client/runtime/library";
import { prisma } from "../lib/prisma.js";
import { VectorStorageService } from "./VectorStorageService.js";

const DEFAULT_LIMIT = 12;

function extractQueryTerms(input: string, maxTerms = 8): string[] {
  const tokens = String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= maxTerms) break;
  }
  return out;
}

function buildTsQuery(terms: string[]) {
  return terms.map((t) => `${t}:*`).join(" | ");
}

export type DocumentChunkHit = {
  id: string;
  exhibitId: string;
  matterId: string;
  pageNumber: number;
  text: string;
  batesNumber: string | null;
  sourcePath: string;
  score: number;
  matchType: "keyword" | "vector";
};

async function keywordSearch(args: {
  workspaceId: string;
  matterId: string;
  exhibitId?: string;
  query: string;
  limit?: number;
}): Promise<DocumentChunkHit[]> {
  const terms = extractQueryTerms(args.query);
  if (!terms.length) return [];
  const tsQuery = buildTsQuery(terms);
  const limit = Math.max(1, Math.min(args.limit || DEFAULT_LIMIT, 50));
  const exhibitFilter = args.exhibitId ? sql`AND "exhibitId" = ${args.exhibitId}` : empty;

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    exhibitId: string;
    matterId: string;
    pageNumber: number;
    text: string;
    batesNumber: string | null;
    sourcePath: string;
    score: number;
  }>>`
    SELECT
      "id",
      "exhibitId",
      "matterId",
      "pageNumber",
      "text",
      "batesNumber",
      "sourcePath",
      ts_rank(to_tsvector('english', "text"), to_tsquery('english', ${tsQuery})) AS score
    FROM "DocumentChunk"
    WHERE "workspaceId" = ${args.workspaceId}
      AND "matterId" = ${args.matterId}
      ${exhibitFilter}
      AND to_tsvector('english', "text") @@ to_tsquery('english', ${tsQuery})
      AND "exhibitId" IN (
        SELECT e."id"
        FROM "Exhibit" e
        WHERE e."documentType" <> 'PRIVILEGED'
          AND e."privilegePending" = false
          AND e."redactionStatus" = 'NONE'
      )
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  return rows.map((row: any) => ({
    id: row.id,
    exhibitId: row.exhibitId,
    matterId: row.matterId,
    pageNumber: row.pageNumber,
    text: row.text,
    batesNumber: row.batesNumber,
    sourcePath: row.sourcePath,
    score: typeof row.score === "number" ? row.score : 0,
    matchType: "keyword" as const
  }));
}

async function vectorSearch(args: {
  workspaceId: string;
  matterId: string;
  exhibitId?: string;
  query: string;
  limit?: number;
}): Promise<DocumentChunkHit[]> {
  const limit = Math.max(1, Math.min(args.limit || DEFAULT_LIMIT, 50));
  const vectorStore = new VectorStorageService();
  const hits = await vectorStore.queryOmniMemory(args.query, args.workspaceId, args.matterId, limit);
  const filtered = hits.filter((hit) => hit.type === "DOCUMENT")
    .filter((hit) => (args.exhibitId ? hit.exhibitId === args.exhibitId : true));
  const exhibitIds = Array.from(new Set(filtered.map((hit) => hit.exhibitId))).filter(Boolean);
  const allowedIds = exhibitIds.length
    ? await prisma.exhibit.findMany({
        where: {
          id: { in: exhibitIds },
          documentType: { not: "PRIVILEGED" },
          privilegePending: false,
          redactionStatus: "NONE"
        },
        select: { id: true }
      })
    : [];
  const allowed = new Set(allowedIds.map((row) => row.id));
  const permitted = filtered.filter((hit) => allowed.has(hit.exhibitId));

  return permitted.map((hit) => ({
    id: hit.id,
    exhibitId: hit.exhibitId,
    matterId: args.matterId,
    pageNumber: hit.pageNumber || 1,
    text: hit.text,
    batesNumber: hit.batesNumber || null,
    sourcePath: hit.sourcePath || "",
    score: hit.score,
    matchType: "vector" as const
  }));
}

export const documentStoreService = {
  async hybridSearch(args: {
    workspaceId: string;
    matterId: string;
    exhibitId?: string;
    query: string;
    limit?: number;
  }): Promise<DocumentChunkHit[]> {
    const limit = Math.max(1, Math.min(args.limit || DEFAULT_LIMIT, 50));
    const keywordLimit = Math.max(4, Math.floor(limit / 2));
    const vectorLimit = Math.max(4, limit - keywordLimit);

    const [keywordHits, vectorHits] = await Promise.all([
      keywordSearch({ ...args, limit: keywordLimit }),
      vectorSearch({ ...args, limit: vectorLimit })
    ]);

    const seen = new Set<string>();
    const merged: DocumentChunkHit[] = [];
    for (const hit of [...keywordHits, ...vectorHits]) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      merged.push(hit);
      if (merged.length >= limit) break;
    }

    return merged;
  }
};
