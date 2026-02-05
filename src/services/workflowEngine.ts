import { MICHIGAN_CIVIL_RULESET, CourtLevel, DeadlineRule } from "../data/jurisdictions/mi";

export type CaseProfile = {
  jurisdictionId: string;
  courtLevel: CourtLevel;
  county: string;
  filingDate?: string;
  serviceDate?: string;
  answerDate?: string;
};

export type RuleDeadline = {
  id: string;
  label: string;
  dueDate: string;
  rule: DeadlineRule;
  triggerDate?: string;
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

export function computeRuleDeadlines(profile: CaseProfile, holidays: string[]): RuleDeadline[] {
  const ruleSet = getActiveRuleSet(profile);
  if (!ruleSet) return [];
  const deadlines: RuleDeadline[] = [];
  const triggerMap: Record<string, string | undefined> = {
    filing_date: profile.filingDate,
    service_date: profile.serviceDate,
    answer_date: profile.answerDate
  };

  ruleSet.stages.forEach((stage) => {
    stage.rules.forEach((rule) => {
      const triggerDate = triggerMap[rule.trigger];
      if (!triggerDate) return;
      const start = new Date(triggerDate);
      if (Number.isNaN(start.getTime())) return;
      const dueDate = addDays(start, rule.days, rule.businessDays, holidays);
      deadlines.push({
        id: `${stage.id}-${rule.id}`,
        label: rule.label,
        dueDate,
        rule,
        triggerDate
      });
    });
  });

  return deadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
