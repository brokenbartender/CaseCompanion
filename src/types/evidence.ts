export type EvidenceItem = {
  id: string;
  name: string;
  type: "pdf" | "audio" | "video" | "doc" | "image";
  size?: string;
  hash?: string;
  uploadedAt?: string;
};

export type EvidenceAnchor = {
  exhibitId: string;
  source: string;
  page: number;
  excerpt?: string;
  confidence?: number;
};
