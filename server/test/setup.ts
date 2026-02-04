import { after } from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prisma } from '../lib/prisma.js';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// 1. Ensure background workers are disabled globally for all tests.
process.env.NODE_ENV = 'test';
process.env.DISABLE_AUTOSTART = 'true';
process.env.INTEGRITY_WORKER_ENABLED = 'false';
process.env.STORAGE_ENCRYPTION_REQUIRED = 'false';
process.env.ISOLATED_ENV = 'true';

const sanitizeDatabaseUrl = () => {
  const raw = process.env.DATABASE_URL;
  if (!raw) return;
  try {
    const url = new URL(raw.trim());
    const rawPath = url.pathname || '';
    const cleanPath = rawPath.replace(/%20/g, '').replace(/\s+/g, '');
    url.pathname = cleanPath || '/lexipro';
    process.env.DATABASE_URL = url.toString();
  } catch {
    process.env.DATABASE_URL = raw.trim().replace(/\s+/g, '');
  }
};

sanitizeDatabaseUrl();

const standardFontsDir = path.resolve(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts');
const standardFontsUrl = pathToFileURL(`${standardFontsDir}${path.sep}`).href;
(pdfjs as any).GlobalWorkerOptions.standardFontDataUrl = standardFontsUrl;
process.env.PDFJS_STANDARD_FONT_DATA_URL = standardFontsUrl;

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args.some((arg) => {
    const text = String(arg);
    return text.includes('standardFontDataUrl') ||
      text.includes('Unable to load font data at:') ||
      text.includes('RELEASE_CERT_KEYS_MISSING');
  })) {
    return;
  }
  return originalWarn(...args);
};

const originalLog = console.log;
console.log = (...args: any[]) => {
  return;
};

const originalInfo = console.info;
console.info = (..._args: any[]) => {
  return;
};

const originalError = console.error;
console.error = (...args: any[]) => {
  if (args.some((arg) => String(arg).includes('AUDIT_SHIPPING_FAIL'))) {
    return;
  }
  return originalError(...args);
};

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: any, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message) {
    const text = String(message);
    if (text.includes('standardFontDataUrl') ||
      text.includes('Unable to load font data at:') ||
      text.includes('RELEASE_CERT_KEYS_MISSING')) {
      return;
    }
  }
  return (originalEmitWarning as any)(warning, ...args);
}) as typeof process.emitWarning;

after(async () => {
  try {
    // 2. Force disconnect the shared Prisma instance.
    await prisma.$disconnect();
  } catch {
    // Ignore disconnect failures in tests.
  }
});
