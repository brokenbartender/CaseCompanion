export type RuleSource = {
  id: string;
  title: string;
  citation: string;
  summary: string;
};

export type RuleTrigger =
  | "filing_date"
  | "service_date"
  | "answer_date"
  | "discovery_served_date"
  | "motion_served_date"
  | "pretrial_date"
  | "custom";

export type DeadlineRule = {
  id: string;
  label: string;
  trigger: RuleTrigger;
  days: number | null;
  businessDays: boolean;
  source: RuleSource;
  manual?: boolean;
  warnAtDays?: number[];
};

export type WorkflowStage = {
  id: string;
  title: string;
  summary: string;
  rules: DeadlineRule[];
};

export type CourtLevel = "district" | "circuit" | "other";

export type JurisdictionRuleSet = {
  id: string;
  version: string;
  courtLevel: CourtLevel;
  stages: WorkflowStage[];
};

export type CourtProfileOverride = {
  courtName: string;
  judgeName?: string;
  overrides: Partial<Record<string, Partial<DeadlineRule>>>;
};

export type JurisdictionDefinition = {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
  ruleSets: JurisdictionRuleSet[];
  courtProfiles: CourtProfileOverride[];
};

export type CaseProfile = {
  jurisdictionId: string;
  courtLevel: CourtLevel;
  county: string;
  filingDate?: string;
  serviceDate?: string;
  answerDate?: string;
  discoveryServedDate?: string;
  motionServedDate?: string;
  pretrialDate?: string;
};

export type RuleDeadline = {
  id: string;
  label: string;
  dueDate: string;
  rule: DeadlineRule;
  triggerDate?: string;
};
