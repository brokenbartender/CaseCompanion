import { localAiService } from "./localAiService.js";

export type ExtractedDeadline = {
  title: string;
  dueDate: Date;
  sourceText: string;
  confidence: number;
  sourceChunkId: string;
};

const monthRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\b/i;

function toDateFromText(raw: string): Date | null {
  const cleaned = raw.replace(/\b(st|nd|rd|th)\b/gi, '').replace(/\s+/g, ' ').trim();
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function addDays(base: Date, days: number) {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function uniqueByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function normalizeWhitespace(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function sentenceForMatch(text: string, start: number, end: number): string {
  const left = text.slice(0, start);
  const right = text.slice(end);
  const leftBoundary = Math.max(left.lastIndexOf('.'), left.lastIndexOf('!'), left.lastIndexOf('?'), left.lastIndexOf('\n'));
  const rightBoundaryOffset = (() => {
    const idx = right.search(/[.!?\n]/);
    return idx === -1 ? right.length : idx + 1;
  })();
  const sentenceStart = leftBoundary === -1 ? 0 : leftBoundary + 1;
  const sentenceEnd = end + rightBoundaryOffset;
  return normalizeWhitespace(text.slice(sentenceStart, sentenceEnd));
}

function ensureInChunk(sourceText: string, chunkText: string): boolean {
  if (!sourceText) return false;
  const normalizedChunk = normalizeWhitespace(chunkText);
  const normalizedSource = normalizeWhitespace(sourceText);
  return normalizedChunk.includes(normalizedSource);
}

async function extractWithLlm(chunkText: string, chunkId: string, baseDate: Date): Promise<ExtractedDeadline[]> {
  try {
    const prompt = [
      "You extract explicit deadline dates from text.",
      "Return JSON array. Each item: {\"title\": string, \"dueDate\": ISO-8601 date-time string, \"sourceText\": exact quote from the text}.",
      "Only include items where sourceText is an exact substring of the text.",
      `Base date (for relative deadlines): ${baseDate.toISOString()}.`,
      "If none, return [].",
      "TEXT:",
      chunkText
    ].join("\n");

    const response = await localAiService.generate(prompt, { stop: [], temperature: 0.1 });
    const raw = String(response || '').trim();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const out: ExtractedDeadline[] = [];
    for (const item of parsed) {
      const sourceText = typeof item?.sourceText === 'string' ? normalizeWhitespace(item.sourceText) : '';
      const dueDateRaw = typeof item?.dueDate === 'string' ? item.dueDate : '';
      const title = typeof item?.title === 'string' ? item.title : 'Detected deadline';
      if (!sourceText || !dueDateRaw) continue;
      if (!ensureInChunk(sourceText, chunkText)) continue;
      const parsedDate = new Date(dueDateRaw);
      if (Number.isNaN(parsedDate.getTime())) continue;
      out.push({
        title,
        dueDate: parsedDate,
        sourceText,
        confidence: 0.35,
        sourceChunkId: chunkId
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function extractDeadlines(text: string, chunkId: string, baseDate: Date): Promise<ExtractedDeadline[]> {
  const body = String(text || '');
  const results: ExtractedDeadline[] = [];

  const relativePatterns: Array<{ regex: RegExp; title: (n: number) => string; confidence: number }> = [
    {
      regex: /\bwithin\s+(\d{1,3})\s+(?:calendar\s+)?days?\b/gi,
      title: (n) => `Due within ${n} days`,
      confidence: 0.6
    },
    {
      regex: /\bno later than\s+(\d{1,3})\s+days?\b/gi,
      title: (n) => `No later than ${n} days`,
      confidence: 0.58
    },
    {
      regex: /\b(\d{1,3})\s+days?\s+after\b/gi,
      title: (n) => `Due ${n} days after`,
      confidence: 0.52
    },
    {
      regex: /\b(\d{1,3})\s+days?\s+from\b/gi,
      title: (n) => `Due ${n} days from`,
      confidence: 0.52
    }
  ];

  for (const pattern of relativePatterns) {
    for (const match of body.matchAll(pattern.regex)) {
      const raw = match[0] || '';
      const days = Number(match[1]);
      if (!Number.isFinite(days) || days <= 0) continue;
      const dueDate = addDays(baseDate, days);
      const snippet = sentenceForMatch(body, match.index || 0, (match.index || 0) + raw.length);
      if (!ensureInChunk(snippet, body)) continue;
      results.push({
        title: pattern.title(days),
        dueDate,
        sourceText: snippet,
        confidence: pattern.confidence,
        sourceChunkId: chunkId
      });
    }
  }

  const absolutePatterns: Array<{ regex: RegExp; confidence: number }> = [
    { regex: /\bby\s+((?:20\d{2})[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01]))\b/gi, confidence: 0.8 },
    { regex: /\bby\s+((?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:20\d{2}))\b/gi, confidence: 0.78 },
    { regex: /\bby\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2})\b/gi, confidence: 0.84 },
    { regex: /\bby\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b/gi, confidence: 0.82 },
    { regex: /\bdue\s+on\s+((?:20\d{2})[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01]))\b/gi, confidence: 0.8 },
    { regex: /\bdue\s+on\s+((?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:20\d{2}))\b/gi, confidence: 0.78 },
    { regex: /\bdue\s+on\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2})\b/gi, confidence: 0.84 },
    { regex: /\bdue\s+on\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b/gi, confidence: 0.82 }
  ];

  for (const pattern of absolutePatterns) {
    for (const match of body.matchAll(pattern.regex)) {
      const raw = match[1] || '';
      if (!raw) continue;
      if (!monthRegex.test(raw) && !/\d{4}/.test(raw)) continue;
      const parsed = toDateFromText(raw);
      if (!parsed) continue;
      const snippet = sentenceForMatch(body, match.index || 0, (match.index || 0) + (match[0] || '').length);
      if (!ensureInChunk(snippet, body)) continue;
      results.push({
        title: `Due by ${raw}`,
        dueDate: parsed,
        sourceText: snippet,
        confidence: pattern.confidence,
        sourceChunkId: chunkId
      });
    }
  }

  const unique = uniqueByKey(results, (item) => `${item.dueDate.toISOString()}::${item.sourceText}`);
  if (unique.length) return unique;

  const llm = await extractWithLlm(body, chunkId, baseDate);
  return uniqueByKey(llm, (item) => `${item.dueDate.toISOString()}::${item.sourceText}`);
}
