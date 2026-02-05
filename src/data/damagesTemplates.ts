export const DAMAGES_CATEGORIES = [
  "Medical expenses",
  "Out-of-pocket costs",
  "Lost wages",
  "Business loss",
  "Pain and suffering",
  "Other"
];

export type DamagesEntry = {
  id: string;
  category: string;
  description: string;
  amount: number;
  evidence: string;
};

export const SETTLEMENT_SECTIONS = [
  "Case overview",
  "Liability summary",
  "Damages summary",
  "Key exhibits",
  "Settlement demand"
];
