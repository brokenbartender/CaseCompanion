export type RuleSource = {
  id: string;
  title: string;
  citation: string;
  summary: string;
};

export type DeadlineRule = {
  id: string;
  label: string;
  trigger:
    | "filing_date"
    | "service_date"
    | "answer_date"
    | "discovery_served_date"
    | "motion_served_date"
    | "pretrial_date"
    | "custom";
  days: number | null;
  businessDays: boolean;
  source: RuleSource;
  manual?: boolean;
};

export type WorkflowStage = {
  id: string;
  title: string;
  summary: string;
  rules: DeadlineRule[];
};

export type CourtLevel = "district" | "circuit";

export type JurisdictionRuleSet = {
  id: string;
  version: string;
  courtLevel: CourtLevel;
  stages: WorkflowStage[];
};

export type JurisdictionDefinition = {
  id: string;
  name: string;
  state: string;
  enabled: boolean;
  ruleSets: JurisdictionRuleSet[];
  localOverlays: {
    county: string;
    notes: string[];
  }[];
};

const MCR_2_102: RuleSource = {
  id: "mcr-2.102",
  title: "MCR 2.102 - Summons; Issuance, Contents, and Return",
  citation: "MCR 2.102",
  summary: "Summons validity and service window from filing."
};

const MCR_2_108: RuleSource = {
  id: "mcr-2.108",
  title: "MCR 2.108 - Time for Answer or Responsive Pleading",
  citation: "MCR 2.108",
  summary: "Typical time to answer after service."
};

const MCR_DISCOVERY: RuleSource = {
  id: "mcr-discovery",
  title: "Michigan Court Rules - Discovery Responses",
  citation: "MCR 2.3xx",
  summary: "Confirm response timing for discovery requests."
};

const MCR_MOTIONS: RuleSource = {
  id: "mcr-motions",
  title: "Michigan Court Rules - Motions Practice",
  citation: "MCR 2.1xx",
  summary: "Confirm notice and response timing for motions."
};

const MCR_PRETRIAL: RuleSource = {
  id: "mcr-pretrial",
  title: "Michigan Court Rules - Pretrial Conference",
  citation: "MCR 2.4xx",
  summary: "Confirm pretrial scheduling and statements."
};

export const MICHIGAN_CIVIL_RULESET: JurisdictionDefinition = {
  id: "mi",
  name: "Michigan",
  state: "MI",
  enabled: true,
  ruleSets: [
    {
      id: "mi-civil-v1-district",
      version: "v1",
      courtLevel: "district",
      stages: [
        {
          id: "pleadings",
          title: "Pleadings",
          summary: "Complaint, summons, and case initiation.",
          rules: [
            {
              id: "service-90",
              label: "Service deadline (90 days from filing)",
              trigger: "filing_date",
              days: 90,
              businessDays: false,
              source: MCR_2_102
            }
          ]
        },
        {
          id: "service",
          title: "Service of Process",
          summary: "Personal or alternate service and proof filing.",
          rules: [
            {
              id: "answer-21",
              label: "Answer deadline (21 days from service)",
              trigger: "service_date",
              days: 21,
              businessDays: false,
              source: MCR_2_108
            }
          ]
        },
        {
          id: "discovery",
          title: "Discovery",
          summary: "Requests, disclosures, and responses.",
          rules: [
            {
              id: "discovery-response",
              label: "Discovery response deadline (confirm by rule)",
              trigger: "discovery_served_date",
              days: null,
              businessDays: false,
              source: MCR_DISCOVERY
            }
          ]
        },
        {
          id: "motions",
          title: "Motions",
          summary: "Summary disposition and pretrial motions.",
          rules: [
            {
              id: "motion-response",
              label: "Motion response deadline (confirm by rule)",
              trigger: "motion_served_date",
              days: null,
              businessDays: false,
              source: MCR_MOTIONS
            }
          ]
        },
        {
          id: "trial",
          title: "Trial",
          summary: "Pretrial conference and trial readiness.",
          rules: [
            {
              id: "pretrial-statement",
              label: "Pretrial statement deadline (confirm scheduling order)",
              trigger: "pretrial_date",
              days: null,
              businessDays: false,
              source: MCR_PRETRIAL
            }
          ]
        }
      ]
    },
    {
      id: "mi-civil-v1-circuit",
      version: "v1",
      courtLevel: "circuit",
      stages: [
        {
          id: "pleadings",
          title: "Pleadings",
          summary: "Complaint, summons, and case initiation.",
          rules: [
            {
              id: "service-90",
              label: "Service deadline (90 days from filing)",
              trigger: "filing_date",
              days: 90,
              businessDays: false,
              source: MCR_2_102
            }
          ]
        },
        {
          id: "service",
          title: "Service of Process",
          summary: "Personal or alternate service and proof filing.",
          rules: [
            {
              id: "answer-21",
              label: "Answer deadline (21 days from service)",
              trigger: "service_date",
              days: 21,
              businessDays: false,
              source: MCR_2_108
            }
          ]
        },
        {
          id: "discovery",
          title: "Discovery",
          summary: "Requests, disclosures, and responses.",
          rules: [
            {
              id: "discovery-response",
              label: "Discovery response deadline (confirm by rule)",
              trigger: "discovery_served_date",
              days: null,
              businessDays: false,
              source: MCR_DISCOVERY
            }
          ]
        },
        {
          id: "motions",
          title: "Motions",
          summary: "Summary disposition and pretrial motions.",
          rules: [
            {
              id: "motion-response",
              label: "Motion response deadline (confirm by rule)",
              trigger: "motion_served_date",
              days: null,
              businessDays: false,
              source: MCR_MOTIONS
            }
          ]
        },
        {
          id: "trial",
          title: "Trial",
          summary: "Pretrial conference and trial readiness.",
          rules: [
            {
              id: "pretrial-statement",
              label: "Pretrial statement deadline (confirm scheduling order)",
              trigger: "pretrial_date",
              days: null,
              businessDays: false,
              source: MCR_PRETRIAL
            }
          ]
        }
      ]
    }
  ],
  localOverlays: [
    {
      county: "Oakland",
      notes: [
        "E-filing via MiFILE required for most civil cases.",
        "Confirm local pretrial or ADR requirements with the clerk."
      ]
    }
  ]
};
