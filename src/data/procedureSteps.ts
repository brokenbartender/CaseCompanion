export type ProcedureStep = {
  id: string;
  title: string;
  summary: string;
  sources: string[];
  checklist: string[];
  benchbookSections?: string[];
};

export const PROCEDURE_STEPS: ProcedureStep[] = [
  {
    id: "court-access-records",
    title: "Court access, records, and PII",
    summary: "Start with court access rules, PII protections, and file handling.",
    sources: ["Civil Benchbook", "MCR Chapter 1-2"],
    benchbookSections: [
      "1.1 Access to Court Proceedings",
      "1.2 Access to Court Files and Records",
      "1.10 Pro Se Litigants",
      "1.11 Waiver of Fees"
    ],
    checklist: [
      "Confirm PII handling and use MC 97 for protected information.",
      "Track any sealing or confidentiality needs early.",
      "Organize records with clear labels and dates.",
      "Plan fee waiver request if applicable (MC 20)."
    ]
  },
  {
    id: "court-selection",
    title: "Court selection and case setup",
    summary: "Choose the correct county court and prepare to file.",
    sources: ["Civil Benchbook", "MCR Chapter 2"],
    benchbookSections: [
      "2.1 Jurisdiction in General",
      "2.3 District Court Subject-Matter Jurisdiction",
      "2.4 Circuit Court Subject-Matter Jurisdiction",
      "2.14 Venue"
    ],
    checklist: [
      "Select the correct District Court (<= court limit) or Circuit Court (> court limit).",
      "Confirm venue is the correct county and defendant resides/acted there.",
      "Gather party names, addresses, and service details.",
      "Confirm personal jurisdiction before filing."
    ]
  },
  {
    id: "pleadings",
    title: "Pleadings and filing",
    summary: "Complaint, summons, filing standards, and fee waiver rules.",
    sources: ["MCR 2.101", "MCR 2.102", "Civil Benchbook"],
    benchbookSections: [
      "3.1 Pleadings Generally",
      "3.2 Complaint",
      "3.3 Summons",
      "3.4 Service of Pleadings and Other Documents"
    ],
    checklist: [
      "Draft complaint with numbered paragraphs and relief requested.",
      "Prepare summons and separate PDFs for each filing.",
      "Initiate the case in MiFILE and save stamped copies.",
      "Verify pleadings are signed and formatted per rules."
    ]
  },
  {
    id: "service-of-process",
    title: "Service of process",
    summary: "Serve the defendant within the required window and file proof.",
    sources: ["MCR 2.105", "Civil Process Handbook", "Service of Process Table"],
    benchbookSections: ["3.4 Service of Pleadings and Other Documents"],
    checklist: [
      "Use a qualified server and complete personal service if possible.",
      "Record service date and method.",
      "File proof of service promptly.",
      "Track summons validity window after filing."
    ]
  },
  {
    id: "responses-defaults",
    title: "Answers and defaults",
    summary: "Track response deadlines and default options if no answer is filed.",
    sources: ["MCR Chapter 2", "Civil Benchbook"],
    benchbookSections: ["3.5 Response to Pleadings"],
    checklist: [
      "Calendar the response deadline after service.",
      "Track any counterclaims or affirmative defenses.",
      "If no answer, prepare default request checklist.",
      "Log the answer date to drive next deadlines."
    ]
  },
  {
    id: "discovery",
    title: "Discovery and disclosures",
    summary: "Requests, responses, and enforcement under the court rules.",
    sources: ["Civil Benchbook", "MCR Chapter 2 (Discovery)"],
    benchbookSections: [
      "5.2 Disclosure",
      "5.3 Depositions",
      "5.4 Interrogatories",
      "5.5 Request for Documents",
      "5.8 Request for Admission",
      "5.11 Disclosure and Discovery Motions"
    ],
    checklist: [
      "Serve discovery requests and track response due dates.",
      "Track response deadlines and follow up on missing items.",
      "Organize exhibits by element and timeline.",
      "Document disputes for motion to compel if needed."
    ]
  },
  {
    id: "motions-adr",
    title: "Motions and ADR",
    summary: "Motion practice, summary disposition, and mediation requirements.",
    sources: ["MCR 2.116", "Summary Disposition Table", "Civil Benchbook"],
    benchbookSections: [
      "4.1 Motions",
      "4.2 Summary Disposition"
    ],
    checklist: [
      "Assess summary disposition grounds and evidence support.",
      "Prepare mediation packet with damages support.",
      "Track motion response and hearing deadlines.",
      "Confirm local motion practice requirements."
    ]
  },
  {
    id: "trial-prep",
    title: "Pretrial and trial",
    summary: "Finalize witnesses, exhibits, and trial presentation.",
    sources: ["Civil Benchbook", "Trial guides"],
    benchbookSections: [
      "7.21 Conducting a Jury Trial",
      "7.22 Opening Statements",
      "7.23 Interim Commentary",
      "7.24 Closing Arguments",
      "7.33 Jury Instructions"
    ],
    checklist: [
      "Finalize witness list, subpoenas, and exhibit list.",
      "Prepare trial notebook, objections, and questions.",
      "Ensure all exhibits are authenticated and ready.",
      "Review jury instructions or bench trial procedure."
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
