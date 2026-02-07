export type PartyType = "individual" | "business" | "state_entity";

export type RiskSeverity = "INFO" | "WARNING" | "CRITICAL" | "FATAL";

export type Case = {
  id: string;
  workspaceId: string;
  matterId?: string | null;
  name: string;
  jurisdictionId: string;
  courtLevel: "district" | "circuit" | "other";
  county: string;
  filingDate?: string | null;
  serviceDate?: string | null;
  answerDate?: string | null;
  discoveryServedDate?: string | null;
  motionServedDate?: string | null;
  pretrialDate?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Party = {
  id: string;
  caseId: string;
  role: string;
  name: string;
  type: PartyType;
  contactJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourtProfile = {
  id: string;
  caseId: string;
  courtName: string;
  judgeName?: string | null;
  localRuleOverridesJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchedulingOrder = {
  id: string;
  caseId: string;
  orderDate: string;
  overridesJson: string;
  createdAt: string;
  updatedAt: string;
};

export type ProceduralDeadline = {
  id: string;
  caseId: string;
  ruleId: string;
  label: string;
  dueDate: string;
  triggerDate?: string | null;
  status: "OPEN" | "COMPLETE" | "MISSED" | "WAIVED";
  severity: RiskSeverity;
  createdAt: string;
  updatedAt: string;
};

export type CaseDocument = {
  id: string;
  caseId: string;
  title: string;
  status: "DRAFT" | "FINAL";
  filed: boolean;
  served: boolean;
  signatureStatus: "MISSING" | "PENDING" | "SIGNED";
  storageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAttempt = {
  id: string;
  caseId: string;
  attemptedAt: string;
  address: string;
  method: string;
  outcome: "SUCCESS" | "FAILED" | "PENDING";
  notes?: string | null;
  proofStorageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceItem = {
  id: string;
  caseId: string;
  exhibitId?: string | null;
  hash: string;
  metadataJson?: string | null;
  redactionStatus: "NONE" | "PENDING" | "APPLIED";
  anchorRefsJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExportPacket = {
  id: string;
  caseId: string;
  type: "FILING" | "SERVICE" | "TRIAL_BINDER" | "CUSTOM";
  status: "DRAFT" | "GENERATED" | "FAILED";
  manifestJson?: string | null;
  storageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RiskRule = {
  id: string;
  caseId: string;
  ruleId: string;
  severity: RiskSeverity;
  message: string;
  createdAt: string;
  updatedAt: string;
};
