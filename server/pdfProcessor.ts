import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from 'fs';
import path from "path";
import { pathToFileURL } from "url";
import { prisma } from './lib/prisma.js';

const BATCH_SIZE = 500; // Optimal batch size for Prisma createMany to balance memory and performance

/**
 * FORENSIC PDF PROCESSOR (v4.9.0)
 * Optimized for high-throughput discovery ingestion.
 * Normalizes PDF origin (bottom-left) to Top-Left before DB persistence.
 */
export const extractAnchorsFromPdf = async (exhibitId: string, filePath: string) => {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const standardFontDataUrl = (() => {
    const envUrl = process.env.PDFJS_STANDARD_FONT_DATA_URL;
    if (envUrl) return envUrl;
    try {
      const fontPath = path.resolve(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts");
      return pathToFileURL(fontPath).toString();
    } catch {
      return "";
    }
  })();
  const loadingTask = pdfjs.getDocument({ data, ...(standardFontDataUrl ? { standardFontDataUrl } : {}) });
  const pdf = await loadingTask.promise;

  let anchorsBatch: any[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Fixed: Cast page to any to safely access the 'view' property for page dimensions
    const viewBox = (page as any).view;
    const pageHeight = viewBox[3] - viewBox[1]; // Total height in PDF units
    
    // Group text items into lines based on vertical Y position (transform[5])
    const linesMap = new Map<number, any[]>();
    textContent.items.forEach((item: any) => {
      const y = Math.round(item.transform[5]);
      if (!linesMap.has(y)) linesMap.set(y, []);
      linesMap.get(y)!.push(item);
    });

    // Sort Y-coordinates from top of page to bottom (descending PDF Y)
    const sortedYs = Array.from(linesMap.keys()).sort((a, b) => b - a);
    
    for (let j = 0; j < sortedYs.length; j++) {
      const y = sortedYs[j];
      const items = linesMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
      const text = items.map(it => it.str).join(' ');
      
      if (!text.trim() || text.trim().length < 2) continue;

      // X coordinate is transform[4]
      const x = items[0].transform[4];
      const lastItem = items[items.length - 1];
      const maxX = lastItem.transform[4] + (lastItem.width || 0);
      const width = maxX - x;
      
      const lineHeights = items.map(it => it.height || Math.abs(it.transform[3]) || 12);
      const height = Math.max(...lineHeights);

      /**
       * COORDINATE ORIGIN NORMALIZATION (Server-Side)
       * PDF: (0,0) is Bottom-Left. Browser: (0,0) is Top-Left.
       * Formula: TopLeftY = PageHeight - (BottomBaselineY + LineHeight)
       */
      const normalizedTopLeftY = pageHeight - y - height;

      anchorsBatch.push({
        exhibitId,
        pageNumber: i,
        lineNumber: j + 1,
        text: text.trim(),
        bboxJson: JSON.stringify([x, normalizedTopLeftY, width, height])
      });

      // Flush batch if size reached
      if (anchorsBatch.length >= BATCH_SIZE) {
        await prisma.anchor.createMany({
          data: anchorsBatch,
          skipDuplicates: true
        });
        anchorsBatch = [];
      }
    }
  }

  // Final flush for remaining anchors
  if (anchorsBatch.length > 0) {
    await prisma.anchor.createMany({
      data: anchorsBatch,
      skipDuplicates: true
    });
  }
};
