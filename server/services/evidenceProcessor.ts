import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import { pathToFileURL } from "url";

export interface EvidenceChunk {
  sourceId: string;
  filename: string;
  text: string;
  pageMap: number[];
}

function cleanText(input: string): string {
  return String(input || "")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const evidenceProcessor = {
  async extractTextFromBuffer(dataBuffer: Buffer, originalFilename: string): Promise<EvidenceChunk> {
    const data = new Uint8Array(dataBuffer);
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

    let combined = "";
    const pageMap: number[] = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .map((item: any) => String(item?.str || ""))
        .join(" ");

      pageMap.push(combined.length);
      combined += `${pageText}\n\n`;
    }

    return {
      sourceId: originalFilename,
      filename: originalFilename,
      text: cleanText(combined),
      pageMap
    };
  }
};
