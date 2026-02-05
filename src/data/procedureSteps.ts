export type ProcedureStep = {
  id: string;
  title: string;
  summary: string;
  sources: string[];
  checklist: string[];
};

export const PROCEDURE_STEPS: ProcedureStep[] = [
  {
    id: "pre-filing-evidence",
    title: "Pre-filing and evidence readiness",
    summary: "Clarify elements, preserve evidence, and organize damages.",
    sources: ["MCR Chapter 2", "Civil Benchbook", "Evidence Guides"],
    checklist: [
      "Confirm assault/battery elements and what you must prove.",
      "Collect police report, medical records, and witness info.",
      "Preserve video and document authenticity (hash + chain of custody)."
    ]
  },
  {
    id: "court-selection",
    title: "Court selection and case setup",
    summary: "Choose the correct Oakland County court and prepare to file.",
    sources: ["Civil Benchbook", "MCR Chapter 2"],
    checklist: [
      "Select 52nd District Court (<= $25,000) or 6th Circuit (> $25,000).",
      "Confirm venue is Oakland County and defendant resides/acted there.",
      "Gather party names, addresses, and service details."
    ]
  },
  {
    id: "filing-initiation",
    title: "MiFILE initiation and pleadings",
    summary: "Prepare the A-to-Z document pack and initiate the case.",
    sources: ["MCR 2.101", "MCR 2.102", "Civil Benchbook"],
    checklist: [
      "Prepare complaint, summons, and required forms as separate PDFs.",
      "Initiate the case in MiFILE and pay fee or submit fee waiver.",
      "Track summons issuance date and expiration."
    ]
  },
  {
    id: "service-of-process",
    title: "Service of process",
    summary: "Serve the defendant within the required window and file proof.",
    sources: ["MCR 2.105", "Civil Process Handbook", "Service of Process Table"],
    checklist: [
      "Use a qualified server and complete personal service if possible.",
      "Record service date and method.",
      "File proof of service promptly."
    ]
  },
  {
    id: "responses-defaults",
    title: "Answers and defaults",
    summary: "Track response deadlines and default options if no answer is filed.",
    sources: ["MCR Chapter 2", "Civil Benchbook"],
    checklist: [
      "Calendar the response deadline after service.",
      "Track any counterclaims or affirmative defenses.",
      "If no answer, prepare default request checklist."
    ]
  },
  {
    id: "discovery",
    title: "Discovery and case development",
    summary: "Exchange evidence, interrogatories, and production requests.",
    sources: ["Civil Benchbook", "MCR Chapter 2"],
    checklist: [
      "Serve initial disclosures and discovery requests.",
      "Track response deadlines and follow up on missing items.",
      "Organize exhibits by element and timeline."
    ]
  },
  {
    id: "motions-adr",
    title: "Motions and ADR",
    summary: "Prepare motions (including summary disposition) and mediation.",
    sources: ["MCR 2.116", "Summary Disposition Table", "Civil Benchbook"],
    checklist: [
      "Assess summary disposition grounds and required evidence.",
      "Prepare mediation packet with damages support.",
      "Track motion response deadlines."
    ]
  },
  {
    id: "trial-prep",
    title: "Pretrial and trial",
    summary: "Finalize witnesses, exhibits, and trial presentation.",
    sources: ["Civil Benchbook", "Trial guides"],
    checklist: [
      "Finalize witness list, subpoenas, and exhibit list.",
      "Prepare trial notebook, objections, and questions.",
      "Ensure all exhibits are authenticated and ready."
    ]
  },
  {
    id: "post-judgment",
    title: "Judgment and enforcement",
    summary: "Record judgment, deadlines, and enforcement steps.",
    sources: ["MCR Chapter 2", "Civil Benchbook"],
    checklist: [
      "Record judgment date and any post-judgment deadlines.",
      "Track enforcement actions and compliance.",
      "Monitor appeal windows if relevant."
    ]
  }
];
