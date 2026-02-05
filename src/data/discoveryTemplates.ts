export type DiscoveryTemplate = {
  id: string;
  title: string;
  description: string;
  fields: string[];
};

export const DISCOVERY_TEMPLATES: DiscoveryTemplate[] = [
  {
    id: "interrogatories",
    title: "Interrogatories",
    description: "Written questions the defendant must answer.",
    fields: ["Request date", "Response due date", "Question list", "Service method"]
  },
  {
    id: "requests-for-production",
    title: "Requests for Production",
    description: "Demand documents, video, or records.",
    fields: ["Request date", "Response due date", "Requested items", "Custodian"]
  },
  {
    id: "requests-for-admission",
    title: "Requests for Admission",
    description: "Yes/no admissions to narrow issues.",
    fields: ["Request date", "Response due date", "Statements", "Service method"]
  }
];
