import { geminiService } from "./geminiService.js";

const ENABLE_AUTO_PARALEGAL = process.env.ENABLE_AUTO_PARALEGAL === "true";

export const metadataExtractor = {
  async extract(text: string, matterId: string) {
    if (!ENABLE_AUTO_PARALEGAL) {
      console.log(`[AutoParalegal] Skipping extraction for matter ${matterId} (Feature Disabled)`);
      return;
    }

    try {
      console.log(`[AutoParalegal] Analyzing matter ${matterId}...`);

      void geminiService;
      void text;

      // Future implementation:
      // 1. Send text to Gemini with "Docket Clerk" prompt
      // 2. Parse JSON response
      // 3. Write to prisma.deadline
    } catch (error) {
      console.error("[AutoParalegal] Failed to extract metadata:", error);
    }
  }
};
