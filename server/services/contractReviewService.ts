import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertGroundedFindings } from "../forensics/assertGroundedFindings.js";
import { geminiService } from "./geminiService.js";

const reviewItemSchema = z.object({
  quote: z.string().min(1),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  explanation: z.string().optional(),
  fixSuggestion: z.string().optional(),
  exhibitId: z.string().optional(),
  anchorId: z.string().optional(),
  page_number: z.number().int().nonnegative().optional(),
  bbox: z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number()
  ]).optional(),
  confidence: z.number().min(0).max(1).optional()
});

export type ContractReviewItem = z.infer<typeof reviewItemSchema>;

function toGroundedInput(item: ContractReviewItem) {
  if (!item.exhibitId || !item.anchorId || item.page_number === undefined || !item.bbox) {
    throw new Error("Grounding requires exhibitId, anchorId, page_number, and bbox in review output.");
  }

  return {
    exhibitId: item.exhibitId,
    anchorId: item.anchorId,
    page_number: item.page_number,
    bbox: item.bbox,
    quote: item.quote,
    confidence: item.confidence
  };
}

export const contractReviewService = {
  async reviewDocument(documentText: string, playbookRules: unknown, workspaceId: string) {
    const prompt = `Analyze this text against the following Playbook Rules: ${JSON.stringify(playbookRules)}.
For every violation, extract the EXACT QUOTE and assign a Risk Level.
Output format: JSON Array of objects { quote, riskLevel, explanation, fixSuggestion }.

Document Text:
${documentText}`;

    const rawResponse = await geminiService.generateResponse(prompt);
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawResponse);
    } catch (error) {
      throw new Error(`Invalid JSON from review model: ${String(error)}`);
    }

    const items = z.array(reviewItemSchema).parse(parsed);
    const groundedInput = items.map(toGroundedInput);

    return assertGroundedFindings(prisma, groundedInput, workspaceId);
  }
};
