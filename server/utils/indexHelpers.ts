import { SignOptions } from 'jsonwebtoken';

export function inferCustodianFromName(filename: string) {
  const name = String(filename || "").toLowerCase();
  if (name.includes("email")) return "IT Mail Archive";
  if (name.includes("budget")) return "Finance Ops";
  if (name.includes("invoice")) return "Accounts Payable";
  if (name.includes("compliance")) return "Compliance Desk";
  if (name.includes("policy")) return "Risk Management";
  return "Custodian Unassigned";
}

export function extractPrimaryDate(input: string) {
  const text = String(input || "");
  const isoMatch = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) return isoMatch[0];
  const slashMatch = text.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d{2})\b/);
  if (slashMatch) return slashMatch[0];
  const monthMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+20\d{2}\b/i);
  if (monthMatch) return monthMatch[0];
  return null;
}

export function parseJwtExpirySeconds(value: SignOptions['expiresIn']): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const factor = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return amount * factor;
}

export function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {} as Record<string, string>);
}

export function readEnv(name: string): string {
  return String(process.env[name] || '').trim();
}

export function sanitizeFilename(input: string): string {
  // Prevent path traversal + Windows drive tricks while preserving readability.
  const base = input ? String(input) : 'file';
  const baseName = base.includes('\\') || base.includes('/') ? base.split(/[\\/]/).pop() || 'file' : base;
  // Keep letters/numbers/basic punctuation; convert everything else to '_'
  return baseName
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180) || 'file';
}

export function safeParseBboxJson(value: any): [number, number, number, number] | null {
  if (Array.isArray(value) && value.length === 4) {
    const nums = value.map((n: any) => Number(n));
    return nums.some((n: number) => !Number.isFinite(n)) ? null : [nums[0], nums[1], nums[2], nums[3]];
  }
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length !== 4) return null;
    const nums = parsed.map((n: any) => Number(n));
    return nums.some((n: number) => !Number.isFinite(n)) ? null : [nums[0], nums[1], nums[2], nums[3]];
  } catch {
    return null;
  }
}

export function withBBoxFields(anchor: any) {
  const bbox = safeParseBboxJson(anchor?.bbox ?? anchor?.bboxJson);
  const locator = {
    docId: String(anchor?.exhibitId || anchor?.exhibit_id || ""),
    pageId: Number(anchor?.pageNumber || anchor?.page_number || 1),
    anchorId: String(anchor?.id || ""),
    startChar: null as number | null,
    endChar: null as number | null,
    bbox
  };
  return { ...anchor, bbox, locator };
}
