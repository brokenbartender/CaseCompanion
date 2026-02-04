export type ProcedureStep = {
  id: string;
  title: string;
  summary: string;
  sources: string[];
  checklist: string[];
};

export const PROCEDURE_STEPS: ProcedureStep[] = [
  {
    id: "access-fees-pro-se",
    title: "Access, fees, and pro se basics",
    summary: "Understand access to proceedings/records and fee waiver basics.",
    sources: ["MCR Chapter 2", "Benchbook Ch. 1"],
    checklist: [
      "Review court access and record rules for your case type.",
      "Determine if fee waiver applies and gather required documents.",
      "Review pro se procedures for filings and appearances."
    ]
  },
  {
    id: "jurisdiction-venue-standing",
    title: "Jurisdiction, venue, and standing",
    summary: "Confirm the court's authority, proper venue, and standing/real party in interest.",
    sources: ["MCR Chapter 2", "Benchbook Ch. 2"],
    checklist: [
      "Identify court type and subject-matter jurisdiction.",
      "Confirm venue is proper (or evaluate change of venue rules).",
      "Confirm standing and real party in interest."
    ]
  },
  {
    id: "pleadings-process",
    title: "Pleadings, summons, and service of process",
    summary: "Prepare pleadings, obtain summons, and complete service under MCR 2.102 and 2.105.",
    sources: ["MCR 2.102", "MCR 2.105", "Civil Process Handbook", "Service of Process Table"],
    checklist: [
      "Confirm summons issuance date and expiration window.",
      "Select a valid service method for the defendant type.",
      "Complete proof of service and record method/date."
    ]
  },
  {
    id: "responsive-pleadings-joinder",
    title: "Responsive pleadings and joinder",
    summary: "Track answers, counterclaims, and joinder rules.",
    sources: ["MCR Chapter 2", "Benchbook Ch. 3"],
    checklist: [
      "Track response deadlines after service.",
      "Identify counterclaims/cross-claims if applicable.",
      "Review joinder rules for parties/claims."
    ]
  },
  {
    id: "discovery",
    title: "Discovery and case development",
    summary: "Organize discovery, disclosures, and evidence preparation.",
    sources: ["Benchbook discovery sections"],
    checklist: [
      "Plan discovery requests and responses.",
      "Organize evidence by issue and timeline.",
      "Track deadlines for responses."
    ]
  },
  {
    id: "motions-summary-disposition",
    title: "Motions and summary disposition",
    summary: "Track motion requirements, timing, and evidence standards for MCR 2.116.",
    sources: ["MCR 2.116", "Summary Disposition Table"],
    checklist: [
      "Identify applicable MCR 2.116 grounds.",
      "Collect admissible evidence for motion support/opposition.",
      "Track filing and response deadlines."
    ]
  },
  {
    id: "pretrial-trial",
    title: "Pretrial, trial, and judgment",
    summary: "Prepare pretrial materials, witness lists, and exhibit packets.",
    sources: ["Benchbook trial sequence"],
    checklist: [
      "Finalize exhibit list and witness list.",
      "Prepare pretrial statement or trial brief if required.",
      "Organize trial presentation materials."
    ]
  },
  {
    id: "post-judgment",
    title: "Post-judgment and enforcement",
    summary: "Track post-judgment motions, appeals, and enforcement steps.",
    sources: ["MCR Chapter 2", "Benchbook post-judgment sections"],
    checklist: [
      "Record judgment date and any post-judgment deadlines.",
      "Track enforcement actions and compliance.",
      "Monitor appeal windows if relevant."
    ]
  }
];
