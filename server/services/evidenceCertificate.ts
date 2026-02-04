import fs from 'fs';
import path from 'path';

export type CertificateAnchor = {
  anchorId: string;
  page?: number;
  bbox?: { x: number; y: number; w: number; h: number };
  excerpt?: string;
};

export type CertificateAuditSummary = {
  id: string;
  type: string;
  ts: string;
};

export type CertificateV1 = {
  certificateVersion: 'v1';
  system: {
    app: 'LexiPro Forensic OS';
    systemVersion?: string;
    buildProofUrl?: string;
  };
  scope: {
    workspaceId: string;
    exhibitId: string;
  };
  canonicalProofs: {
    auditLog: { source: 'workspace_audit'; note: string };
    integrity: {
      source: 'integrity_ledger';
      isValid: boolean;
      integrityHash?: string;
      eventCount?: number;
    };
    anchorMapping: { source: 'anchors'; anchorCount: number };
  };
  anchors: CertificateAnchor[];
  auditSummary: CertificateAuditSummary[];
  disclaimers: string[];
};

type RawAnchor = {
  id: string;
  pageNumber?: number | null;
  bboxJson?: string | null;
  text?: string | null;
};

type IntegritySummary = {
  isValid: boolean;
  integrityHash: string | null;
  eventCount: number;
};

type AuditEventRow = {
  id: string;
  eventType: string;
  createdAt: Date | string;
};

const buildProofDocPath = path.resolve(process.cwd(), 'docs', 'LexiPro_Live_Demo_Script.md');
let cachedBuildProofUrl: string | undefined;

function safeParseBboxJson(raw?: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 4) return null;
    const nums = parsed.map((n: any) => Number(n));
    return nums.some((n: number) => !Number.isFinite(n)) ? null : [nums[0], nums[1], nums[2], nums[3]];
  } catch {
    return null;
  }
}

function mapAnchors(anchors: RawAnchor[]): CertificateAnchor[] {
  return anchors.map((anchor) => {
    const bboxArray = safeParseBboxJson(anchor.bboxJson);
    const excerpt = String(anchor.text || '').trim().slice(0, 160);
    return {
      anchorId: String(anchor.id),
      page: anchor.pageNumber ?? undefined,
      bbox: bboxArray
        ? { x: bboxArray[0], y: bboxArray[1], w: bboxArray[2], h: bboxArray[3] }
        : undefined,
      excerpt: excerpt ? excerpt : undefined
    };
  });
}

function mapAuditSummary(events: AuditEventRow[]): CertificateAuditSummary[] {
  return events.map((event) => ({
    id: String(event.id),
    type: String(event.eventType),
    ts: new Date(event.createdAt).toISOString()
  }));
}

export function getBuildProofUrl(): string | undefined {
  if (cachedBuildProofUrl !== undefined) return cachedBuildProofUrl;
  try {
    const content = fs.readFileSync(buildProofDocPath, 'utf-8');
    const match = content.match(/https?:\/\/\S+/);
    cachedBuildProofUrl = match ? match[0].replace(/[)\]]+$/, '') : undefined;
  } catch {
    cachedBuildProofUrl = undefined;
  }
  return cachedBuildProofUrl;
}

export function buildCertificateV1(args: {
  workspaceId: string;
  exhibitId: string;
  anchors: RawAnchor[];
  integrity: IntegritySummary;
  auditEvents: AuditEventRow[];
  systemVersion?: string;
  buildProofUrl?: string;
  auditNote: string;
}): CertificateV1 {
  const buildProofUrl = args.buildProofUrl || undefined;
  return {
    certificateVersion: 'v1',
    system: {
      app: 'LexiPro Forensic OS',
      ...(args.systemVersion ? { systemVersion: args.systemVersion } : {}),
      ...(buildProofUrl ? { buildProofUrl } : {})
    },
    scope: {
      workspaceId: args.workspaceId,
      exhibitId: args.exhibitId
    },
    canonicalProofs: {
      auditLog: { source: 'workspace_audit', note: args.auditNote },
      integrity: {
        source: 'integrity_ledger',
        isValid: Boolean(args.integrity.isValid),
        ...(args.integrity.integrityHash ? { integrityHash: args.integrity.integrityHash } : {}),
        ...(Number.isFinite(args.integrity.eventCount) ? { eventCount: args.integrity.eventCount } : {})
      },
      anchorMapping: { source: 'anchors', anchorCount: args.anchors.length }
    },
    anchors: mapAnchors(args.anchors),
    auditSummary: mapAuditSummary(args.auditEvents),
    disclaimers: [
      'Attests to evidence grounding + integrity verification; not legal advice.',
      'UI badges/headers are non-canonical conveniences; audit + integrity are canonical.'
    ]
  };
}
