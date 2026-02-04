/**
 * LexiPro Forensic OS — Grounding Enforcement
 *
 * Enforces PRP-001: Zero tolerance for ungrounded forensic findings.
 *
 * Any code path that intends to persist or display admissible "forensic findings"
 * must pass through this validator.
 */

import type { PrismaClient } from '@prisma/client';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import { storageService } from '../storageService.js';
import { forensicFindingInputSchema, forensicFindingSchema, type ForensicFinding } from './forensicSchemas.js';

export class GroundingError extends Error {
  status: number;
  code: string;
  detail?: any;

  constructor(status: number, code: string, message: string, detail?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export class HallucinationError extends Error {
  status: number;
  code: string;
  detail?: any;

  constructor(message: string, detail?: any) {
    super(message);
    this.status = 422;
    this.code = 'HALLUCINATION_DETECTED';
    this.detail = detail;
  }
}

const OPTICAL_CACHE_MAX = 500;
const opticalCache = new Map<string, string>();

function getCachedOpticalText(key: string): string | null {
  const cached = opticalCache.get(key);
  if (!cached) return null;
  opticalCache.delete(key);
  opticalCache.set(key, cached);
  return cached;
}

function setCachedOpticalText(key: string, value: string) {
  if (opticalCache.has(key)) {
    opticalCache.delete(key);
  }
  opticalCache.set(key, value);
  if (opticalCache.size > OPTICAL_CACHE_MAX) {
    const oldest = opticalCache.keys().next().value;
    if (oldest) {
      opticalCache.delete(oldest);
    }
  }
}

function normalizeText(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const row = new Array<number>(bLen + 1);
  for (let j = 0; j <= bLen; j += 1) row[j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= bLen; j += 1) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + cost
      );
      prev = temp;
    }
  }
  return row[bLen];
}

function similarityScore(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

function bboxIntersects(
  a: [number, number, number, number],
  b: [number, number, number, number]
) {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  const overlapX = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const overlapY = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return overlapX > 0 && overlapY > 0;
}

async function extractTextFromPdfBytes(
  pdfBytes: Buffer,
  pageNumber: number,
  bbox: [number, number, number, number]
): Promise<string> {
  const data = new Uint8Array(pdfBytes);
  const standardFontDataUrl = (() => {
    const envUrl = process.env.PDFJS_STANDARD_FONT_DATA_URL;
    if (envUrl) return envUrl;
    try {
      const fontPath = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts');
      return pathToFileURL(fontPath).toString();
    } catch {
      return '';
    }
  })();
  const loadingTask = pdfjs.getDocument({
    data,
    ...(standardFontDataUrl ? { standardFontDataUrl } : {})
  });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();

  const viewBox = (page as any).view;
  const pageHeight = viewBox[3] - viewBox[1];

  const matches: Array<{ text: string; x: number; y: number }> = [];
  for (const item of textContent.items as any[]) {
    const renderMode = Number(item?.textRenderingMode);
    const height = item.height || Math.abs(item.transform?.[3] || 12);
    if (renderMode === 3 || height < 1) {
      continue;
    }
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const width = item.width || 0;
    const normalizedTopLeftY = pageHeight - y - height;
    const itemBox: [number, number, number, number] = [x, normalizedTopLeftY, width, height];
    if (bboxIntersects(bbox, itemBox)) {
      matches.push({ text: String(item.str || ''), x, y: normalizedTopLeftY });
    }
  }

  matches.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return matches.map((m) => m.text).join(' ').replace(/\s+/g, ' ').trim();
}

function parseBboxJson(bboxJson: string): [number, number, number, number] | null {
  try {
    const parsed = JSON.parse(bboxJson);
    if (!Array.isArray(parsed) || parsed.length !== 4) return null;
    const nums = parsed.map((n: any) => Number(n));
    if (nums.some((n: number) => !Number.isFinite(n))) return null;
    return [nums[0], nums[1], nums[2], nums[3]];
  } catch {
    return null;
  }
}

function bboxCloseEnough(
  a: [number, number, number, number],
  b: [number, number, number, number],
  tolerance = 2
): boolean {
  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(a[i] - b[i]) > tolerance) return false;
  }
  return true;
}

/**
 * Validate + verify that each finding's anchorId exists, belongs to the workspace,
 * belongs to the stated exhibitId, and matches page_number + bbox.
 *
 * If ANY finding fails -> throws GroundingError(422).
 */
export async function assertGroundedFindings(
  prisma: PrismaClient,
  findingsRaw: unknown,
  workspaceId: string,
  opts?: { bboxTolerance?: number }
): Promise<ForensicFinding[]> {
  let findingsInput: any[];
  try {
    findingsInput = z.array(forensicFindingInputSchema).min(1).parse(findingsRaw);
  } catch (e: any) {
    throw new GroundingError(422, 'UNGROUNDED_FINDINGS', 'Findings failed schema validation (bbox/page_number required).', {
      message: e?.message || String(e),
    });
  }

  const tolerance = opts?.bboxTolerance ?? 2;

  const enriched: ForensicFinding[] = [];
  const pdfCache = new Map<string, Buffer>();
  for (const f of findingsInput) {
    const anchor = await prisma.anchor.findFirst({
      where: {
        id: f.anchorId,
        exhibitId: f.exhibitId,
        exhibit: { workspaceId, deletedAt: null },
      },
      select: {
        id: true,
        exhibitId: true,
        pageNumber: true,
        bboxJson: true,
        exhibit: { select: { integrityHash: true, storageKey: true } }
      },
    });

    if (!anchor) {
      throw new GroundingError(
        422,
        'ANCHOR_NOT_FOUND',
        'anchorId does not exist for this workspace/exhibit.',
        { anchorId: f.anchorId, exhibitId: f.exhibitId }
      );
    }

    if (anchor.pageNumber !== f.page_number) {
      throw new GroundingError(
        422,
        'PAGE_MISMATCH',
        'page_number does not match stored anchor pageNumber.',
        { anchorId: f.anchorId, expected: anchor.pageNumber, got: f.page_number }
      );
    }

    const storedBbox = parseBboxJson(anchor.bboxJson);
    if (!storedBbox) {
      throw new GroundingError(
        422,
        'ANCHOR_BBOX_INVALID',
        'Stored anchor bboxJson is invalid and cannot be used for grounding.',
        { anchorId: f.anchorId }
      );
    }

    if (!bboxCloseEnough(storedBbox, f.bbox, tolerance)) {
      throw new GroundingError(
        422,
        'BBOX_MISMATCH',
        'bbox does not match stored anchor bbox within tolerance.',
        { anchorId: f.anchorId, tolerance, expected: storedBbox, got: f.bbox }
      );
    }

    const citedQuote = String(f.quote || '').trim();
    if (!citedQuote) {
      throw new GroundingError(
        422,
        'QUOTE_MISSING',
        'quote is required for optical verification.',
        { anchorId: f.anchorId, exhibitId: f.exhibitId }
      );
    }

    const cacheKey = `${f.exhibitId}:${f.page_number}:${storedBbox.join(',')}`;
    let extractedText = getCachedOpticalText(cacheKey);
    if (!extractedText) {
      const storageKey = anchor.exhibit?.storageKey;
      if (!storageKey) {
        throw new GroundingError(
          422,
          'EXHIBIT_STORAGE_MISSING',
          'Exhibit storage key is missing for optical verification.',
          { anchorId: f.anchorId, exhibitId: f.exhibitId }
        );
      }
      let pdfBytes = pdfCache.get(f.exhibitId);
      if (!pdfBytes) {
        pdfBytes = await storageService.download(storageKey);
        pdfCache.set(f.exhibitId, pdfBytes);
      }
      extractedText = await extractTextFromPdfBytes(pdfBytes, f.page_number, storedBbox);
      setCachedOpticalText(cacheKey, extractedText);
    }

    const similarity = similarityScore(normalizeText(extractedText), normalizeText(citedQuote));
    if (similarity < 0.85) {
      throw new HallucinationError('Optical verification failed.', {
        anchorId: f.anchorId,
        exhibitId: f.exhibitId,
        similarity,
        extractedText,
        citedQuote
      });
    }

    const integrityHash = anchor.exhibit?.integrityHash || '';
    const enrichedFinding = {
      ...f,
      integrityHash,
    };
    const validated = forensicFindingSchema.parse(enrichedFinding);
    enriched.push(validated);
  }

  return enriched;
}

export function to422(res: any, err: any) {
  if (err instanceof GroundingError || err instanceof HallucinationError) {
    return res.status(err.status).json({ error: err.code, detail: err.detail, message: err.message });
  }
  return res.status(500).json({ error: 'GROUNDING_VALIDATION_FAILED', message: err?.message || String(err) });
}
