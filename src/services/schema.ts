import { z } from 'zod';

export const ForensicFindingSchema = z.object({
  claim: z.string().min(10),
  source_file_hash: z.string(),
  physical_grounding: z.object({
    page_number: z.number(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    confidence_score: z.number().min(0.9)
  })
});
