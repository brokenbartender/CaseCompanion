/**
 * LexiPro Forensic OS — Canonical Forensic Contracts
 *
 * PRP-001 Grounding Mandate:
 *  - No “forensic finding” may exist (DB or UI) without physical grounding.
 *  - Grounding requires: exhibitId, anchorId, page_number, bbox:[x1,y1,x2,y2].
 */

import { z } from 'zod';

export const bboxSchema = z
  .tuple([
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
  ])
  .refine((v) => v.every((n) => Number.isFinite(n)), { message: 'bbox must be finite numbers' });

/**
 * Single canonical contract for any grounded, admissible forensic finding.
 *
 * NOTE: confidence/quote are optional by contract, but bbox is NEVER optional.
 */
export const forensicFindingInputSchema = z
  .object({
    exhibitId: z.string().min(1),
    anchorId: z.string().min(1),
    page_number: z.coerce.number().int().nonnegative(),
    bbox: bboxSchema,
    quote: z.string().optional(),
    confidence: z.coerce.number().min(0).max(1).optional(),
  })
  .strict();

export const forensicFindingSchema = forensicFindingInputSchema
  .extend({
    integrityHash: z.string().min(16),
  })
  .strict();

export const forensicFindingsSchema = z.array(forensicFindingSchema).min(1);

/**
 * Narrative drafts are explicitly non-forensic and must never be treated as evidence.
 */
export const narrativeDraftSchema = z
  .object({
    type: z.literal('narrative_draft'),
    admissible: z.literal(false),
    text: z.string().default(''),
    data: z.any().optional(),
    warnings: z.array(z.string()).optional(),
  })
  .strict();

export type ForensicFinding = z.infer<typeof forensicFindingSchema>;
