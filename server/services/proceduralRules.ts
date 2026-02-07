import { prisma } from "../lib/prisma.js";
import {
  MICHIGAN_CIVIL_RULESET,
  type CaseProfile,
  type DeadlineRule,
  type RuleDeadline,
  type CourtProfileOverride
} from "../../shared/rules/index.js";

type RuleOverride = Partial<DeadlineRule> & { dueDate?: string };

type SchedulingOverrideMap = Record<string, RuleOverride>;

export type ProceduralAlert = {
  ruleId: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "FATAL";
  dueDate?: string;
};

export function getActiveRuleSet(profile: CaseProfile) {
  if (profile.jurisdictionId !== "mi") return null;
  return MICHIGAN_CIVIL_RULESET.ruleSets.find((set) => set.courtLevel === profile.courtLevel) || null;
}

function addDays(start: Date, days: number, businessDays: boolean, holidays: string[]) {
  let count = 0;
  const cursor = new Date(start);
  while (count < days) {
    cursor.setDate(cursor.getDate() + 1);
    if (businessDays) {
      const day = cursor.getDay();
      const key = cursor.toISOString().slice(0, 10);
      if (day === 0 || day === 6 || holidays.includes(key)) {
        continue;
      }
    }
    count += 1;
  }
  return cursor.toISOString().slice(0, 10);
}

function parseOverrides(raw?: string | null): SchedulingOverrideMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as SchedulingOverrideMap;
  } catch {
    return {};
  }
  return {};
}

function applyOverrides(rule: DeadlineRule, courtOverrides: CourtProfileOverride[], scheduleOverrides: SchedulingOverrideMap) {
  const scheduleOverride = scheduleOverrides[rule.id];
  const merged: RuleOverride = { ...rule, ...scheduleOverride };
  const courtOverride = courtOverrides.find((profile) => profile.overrides?.[rule.id]);
  if (courtOverride?.overrides?.[rule.id]) {
    Object.assign(merged, courtOverride.overrides[rule.id]);
  }
  return merged;
}

export function computeRuleDeadlines(
  profile: CaseProfile,
  holidays: string[],
  courtOverrides: CourtProfileOverride[] = [],
  scheduleOverridesRaw?: string | null
): { deadlines: RuleDeadline[]; alerts: ProceduralAlert[] } {
  const ruleSet = getActiveRuleSet(profile);
  if (!ruleSet) return { deadlines: [], alerts: [] };
  const deadlines: RuleDeadline[] = [];
  const alerts: ProceduralAlert[] = [];
  const scheduleOverrides = parseOverrides(scheduleOverridesRaw);
  const triggerMap: Record<string, string | undefined> = {
    filing_date: profile.filingDate,
    service_date: profile.serviceDate,
    answer_date: profile.answerDate,
    discovery_served_date: profile.discoveryServedDate,
    motion_served_date: profile.motionServedDate,
    pretrial_date: profile.pretrialDate
  };

  ruleSet.stages.forEach((stage) => {
    stage.rules.forEach((rule) => {
      const effective = applyOverrides(rule, courtOverrides, scheduleOverrides);
      const triggerDate = triggerMap[rule.trigger];

      if (effective.days == null) {
        if (effective.trigger !== "custom" && !triggerDate) {
          alerts.push({
            ruleId: effective.id,
            message: `${effective.label} needs a trigger date to calculate.`,
            severity: "WARNING"
          });
          return;
        }
        deadlines.push({
          id: `${stage.id}-${effective.id}`,
          label: effective.label,
          dueDate: effective.dueDate ?? "",
          rule: { ...rule, manual: true },
          triggerDate
        });
        return;
      }

      if (!triggerDate) {
        alerts.push({
          ruleId: effective.id,
          message: `${effective.label} needs a trigger date to calculate.`,
          severity: "WARNING"
        });
        return;
      }

      const start = new Date(triggerDate);
      if (Number.isNaN(start.getTime())) return;

      const overrideDue = effective.dueDate;
      const dueDate = overrideDue || addDays(start, effective.days, effective.businessDays, holidays);

      deadlines.push({
        id: `${stage.id}-${effective.id}`,
        label: effective.label,
        dueDate,
        rule: effective as DeadlineRule,
        triggerDate
      });

      const warnAt = effective.warnAtDays || [];
      warnAt.forEach((warnDay) => {
        alerts.push({
          ruleId: effective.id,
          message: `${effective.label}: warning checkpoint at ${warnDay} days`,
          severity: warnDay >= 80 ? "CRITICAL" : "WARNING",
          dueDate
        });
      });
    });
  });

  return {
    deadlines: deadlines.sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")),
    alerts
  };
}

export async function syncProceduralDeadlines(args: {
  caseId: string;
  profile: CaseProfile;
  holidays: string[];
  scheduleOverridesJson?: string | null;
}) {
  const { caseId, profile, holidays, scheduleOverridesJson } = args;
  const { deadlines } = computeRuleDeadlines(profile, holidays, MICHIGAN_CIVIL_RULESET.courtProfiles, scheduleOverridesJson);
  const updates = deadlines.map((deadline) =>
    prisma.proceduralDeadline.upsert({
      where: { caseId_ruleId: { caseId, ruleId: deadline.rule.id } },
      update: {
        label: deadline.label,
        dueDate: new Date(deadline.dueDate),
        triggerDate: deadline.triggerDate ? new Date(deadline.triggerDate) : null
      },
      create: {
        caseId,
        ruleId: deadline.rule.id,
        label: deadline.label,
        dueDate: new Date(deadline.dueDate),
        triggerDate: deadline.triggerDate ? new Date(deadline.triggerDate) : null
      }
    })
  );

  await prisma.$transaction(updates);
  return deadlines;
}
