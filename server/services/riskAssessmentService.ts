import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { documentStoreService } from "./documentStoreService.js";

export const playbookRuleSchema = z.object({
  clause_type: z.string().min(1),
  preferred_position: z.string().min(1),
  risk_triggers: z.array(z.string()).default([]),
  max_risk_score: z.number().int().nonnegative()
});

const playbookSchema = z.array(playbookRuleSchema).min(1);

export type PlaybookRule = z.infer<typeof playbookRuleSchema>;

type Severity = "LOW" | "MEDIUM" | "HIGH";

function normalize(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findTriggerMatches(text: string, triggers: string[]) {
  const haystack = normalize(text);
  const matches: string[] = [];
  for (const trigger of triggers) {
    const needle = normalize(trigger);
    if (!needle) continue;
    if (haystack.includes(needle)) matches.push(trigger);
  }
  return matches;
}

function severityFromScore(score: number, maxScore: number): Severity {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return "LOW";
  const ratio = score / maxScore;
  if (ratio >= 0.66) return "HIGH";
  if (ratio >= 0.33) return "MEDIUM";
  return "LOW";
}

function buildRedlineSuggestion(rule: PlaybookRule, triggerMatches: string[]) {
  const preferred = rule.preferred_position.trim();
  if (triggerMatches.length) {
    return `Revise clause to align with preferred position: ${preferred}. Limit or remove: ${triggerMatches.join(", ")}.`;
  }
  return `Align clause with preferred position: ${preferred}.`;
}

export async function assessExhibitAgainstPlaybook(args: {
  workspaceId: string;
  matterId: string;
  exhibitId: string;
  playbookId: string;
  maxChunksPerRule?: number;
}) {
  const playbook = await prisma.playbook.findFirst({
    where: { id: args.playbookId, workspaceId: args.workspaceId }
  });
  if (!playbook) {
    throw new Error("Playbook not found.");
  }

  let rules: PlaybookRule[] = [];
  try {
    const parsed = JSON.parse(playbook.rulesJson || "[]");
    rules = playbookSchema.parse(parsed);
  } catch (err: any) {
    throw new Error(`Playbook rules invalid: ${err?.message || String(err)}`);
  }

  const seededAssessments = await prisma.riskAssessment.findMany({
    where: {
      workspaceId: args.workspaceId,
      playbookId: args.playbookId,
      clause: {
        exhibitId: args.exhibitId
      }
    },
    include: {
      clause: true
    }
  });
  if (seededAssessments.length) {
    return {
      assessments: seededAssessments.map((item: any) => ({
        clauseId: item.clauseId,
        clauseType: item.clause?.clauseType || "SOURCE_CONFLICT",
        severity: item.severity as Severity,
        redlineSuggestion: item.redlineSuggestion,
        citation_found: true,
        clauseText: item.clause?.text || "",
        citations: [],
        triggerMatches: []
      })),
      missingCitations: 0
    };
  }

  const chunkCount = await prisma.documentChunk.count({
    where: {
      workspaceId: args.workspaceId,
      matterId: args.matterId,
      exhibitId: args.exhibitId
    }
  });
  if (!chunkCount) {
    return { assessments: [], missingCitations: rules.length };
  }

  const maxChunks = Math.max(1, Math.min(args.maxChunksPerRule || 8, 20));
  const assessments: Array<{
    clauseId: string;
    clauseType: string;
    severity: Severity;
    redlineSuggestion: string;
    citation_found: boolean;
    clauseText: string;
    citations: Array<{
      chunkId: string;
      exhibitId: string;
      pageNumber: number;
      text: string;
    }>;
    triggerMatches: string[];
  }> = [];

  let missingCitations = 0;

  for (const rule of rules) {
    const query = [rule.clause_type, rule.preferred_position, ...rule.risk_triggers].join(" ").trim();
    const hits = await documentStoreService.hybridSearch({
      workspaceId: args.workspaceId,
      matterId: args.matterId,
      exhibitId: args.exhibitId,
      query: query || rule.clause_type,
      limit: maxChunks
    });

    if (!hits.length) {
      missingCitations += 1;
      continue;
    }

    const requiresTriggerMatch = Array.isArray(rule.risk_triggers) && rule.risk_triggers.length > 0;
    let matched = false;
    for (const hit of hits) {
      const triggerMatches = findTriggerMatches(hit.text, rule.risk_triggers || []);
      if (requiresTriggerMatch && triggerMatches.length === 0) {
        continue;
      }
      const score = Math.min(rule.max_risk_score || 0, triggerMatches.length);
      const severity = severityFromScore(score, rule.max_risk_score || 0);
      const redlineSuggestion = buildRedlineSuggestion(rule, triggerMatches);

      const existingClause = await prisma.clause.findFirst({
        where: {
          workspaceId: args.workspaceId,
          exhibitId: args.exhibitId,
          clauseType: rule.clause_type,
          sourceChunkId: hit.id
        }
      });
      const clause = existingClause
        ? await prisma.clause.update({
            where: { id: existingClause.id },
            data: { text: hit.text }
          })
        : await prisma.clause.create({
            data: {
              workspaceId: args.workspaceId,
              matterId: args.matterId,
              exhibitId: args.exhibitId,
              sourceChunkId: hit.id,
              clauseType: rule.clause_type,
              text: hit.text
            }
          });

      await prisma.riskAssessment.create({
        data: {
          workspaceId: args.workspaceId,
          clauseId: clause.id,
          playbookId: args.playbookId,
          severity,
          redlineSuggestion,
          triggerMatchesJson: JSON.stringify(triggerMatches)
        }
      });

      assessments.push({
        clauseId: clause.id,
        clauseType: rule.clause_type,
        severity,
        redlineSuggestion,
        citation_found: true,
        clauseText: clause.text,
        citations: [{
          chunkId: hit.id,
          exhibitId: hit.exhibitId,
          pageNumber: hit.pageNumber,
          text: hit.text
        }],
        triggerMatches
      });
      matched = true;
    }
    if (!matched) {
      missingCitations += 1;
    }
  }

  return { assessments, missingCitations };
}

