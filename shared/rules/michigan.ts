import type { JurisdictionDefinition, RuleSource } from "./types";

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

const MCR_2_107: RuleSource = {
  id: "mcr-2.107",
  title: "MCR 2.107 - Service of Process",
  citation: "MCR 2.107",
  summary: "Service timing and proof requirements."
};

const MCR_2_401: RuleSource = {
  id: "mcr-2.401",
  title: "MCR 2.401 - Scheduling Orders",
  citation: "MCR 2.401",
  summary: "Scheduling order deadlines and disclosures."
};

const MCR_JURY: RuleSource = {
  id: "mcr-2.508",
  title: "MCR 2.508 - Jury Demand",
  citation: "MCR 2.508",
  summary: "Jury demand requirements (confirm timing by case type)."
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
              id: "summons-91",
              label: "Summons expires (91 days from filing)",
              trigger: "filing_date",
              days: 91,
              businessDays: false,
              warnAtDays: [60, 80],
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
              warnAtDays: [14, 18],
              source: MCR_2_108
            },
            {
              id: "service-proof",
              label: "File proof of service (confirm timing by court)",
              trigger: "service_date",
              days: null,
              businessDays: false,
              source: MCR_2_107
            }
          ]
        },
        {
          id: "disclosures",
          title: "Initial Disclosures",
          summary: "Scheduling order and initial disclosures.",
          rules: [
            {
              id: "initial-disclosures",
              label: "Initial disclosures due (14 days after scheduling order)",
              trigger: "pretrial_date",
              days: 14,
              businessDays: false,
              warnAtDays: [7, 10],
              source: MCR_2_401
            }
          ]
        },
        {
          id: "jury",
          title: "Jury Demand",
          summary: "Confirm jury demand timing.",
          rules: [
            {
              id: "jury-demand",
              label: "Jury demand (confirm timing by court)",
              trigger: "filing_date",
              days: null,
              businessDays: false,
              source: MCR_JURY
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
              id: "summons-91",
              label: "Summons expires (91 days from filing)",
              trigger: "filing_date",
              days: 91,
              businessDays: false,
              warnAtDays: [60, 80],
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
              warnAtDays: [14, 18],
              source: MCR_2_108
            },
            {
              id: "service-proof",
              label: "File proof of service (confirm timing by court)",
              trigger: "service_date",
              days: null,
              businessDays: false,
              source: MCR_2_107
            }
          ]
        },
        {
          id: "disclosures",
          title: "Initial Disclosures",
          summary: "Scheduling order and initial disclosures.",
          rules: [
            {
              id: "initial-disclosures",
              label: "Initial disclosures due (14 days after scheduling order)",
              trigger: "pretrial_date",
              days: 14,
              businessDays: false,
              warnAtDays: [7, 10],
              source: MCR_2_401
            }
          ]
        },
        {
          id: "jury",
          title: "Jury Demand",
          summary: "Confirm jury demand timing.",
          rules: [
            {
              id: "jury-demand",
              label: "Jury demand (confirm timing by court)",
              trigger: "filing_date",
              days: null,
              businessDays: false,
              source: MCR_JURY
            }
          ]
        }
      ]
    }
  ],
  courtProfiles: []
};
