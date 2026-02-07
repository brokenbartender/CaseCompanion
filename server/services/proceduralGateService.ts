import { prisma } from "../lib/prisma.js";
import { scanMatterForPii } from "./piiScanService.js";

export type ProceduralGate = {
  id: string;
  label: string;
  status: "PASS" | "BLOCK";
  severity: "INFO" | "WARNING" | "CRITICAL" | "FATAL";
  action: string;
  details?: string;
};

export async function evaluateProceduralGates(args: {
  workspaceId: string;
  matterId: string;
  caseId: string;
}) {
  const { workspaceId, matterId } = args;
  const gates: ProceduralGate[] = [];

  const docs = await prisma.caseDocument.findMany({
    where: { caseId: args.caseId }
  });
  const unsignedDocs = docs.filter((doc) => doc.signatureStatus !== "SIGNED");
  if (unsignedDocs.length) {
    gates.push({
      id: "SIGNATURES_REQUIRED",
      label: "Signatures required",
      status: "BLOCK",
      severity: "CRITICAL",
      action: "Sign required documents before export.",
      details: `${unsignedDocs.length} document(s) missing signatures.`
    });
  } else {
    gates.push({
      id: "SIGNATURES_REQUIRED",
      label: "Signatures required",
      status: "PASS",
      severity: "INFO",
      action: "All required signatures captured."
    });
  }

  const serviceAttempts = await prisma.serviceAttempt.findMany({
    where: { caseId: args.caseId },
    orderBy: { attemptedAt: "desc" }
  });
  const hasServiceSuccess = serviceAttempts.some((attempt) => attempt.outcome === "SUCCESS");
  if (!hasServiceSuccess) {
    gates.push({
      id: "PROOF_OF_SERVICE",
      label: "Proof of service",
      status: "BLOCK",
      severity: "CRITICAL",
      action: "Log a successful service attempt before exporting."
    });
  } else {
    gates.push({
      id: "PROOF_OF_SERVICE",
      label: "Proof of service",
      status: "PASS",
      severity: "INFO",
      action: "Service logged."
    });
  }

  const piiFindings = await scanMatterForPii(workspaceId, matterId);
  if (piiFindings.length) {
    const exhibitIds = Array.from(new Set(piiFindings.map((finding) => finding.exhibitId)));
    const exhibits = await prisma.exhibit.findMany({
      where: { workspaceId, matterId, id: { in: exhibitIds } },
      select: { id: true, redactionStatus: true }
    });
    const redactionMap = new Map(exhibits.map((exhibit) => [exhibit.id, exhibit.redactionStatus]));
    const unredacted = piiFindings.filter((finding) => redactionMap.get(finding.exhibitId) !== "APPLIED");
    if (unredacted.length) {
      gates.push({
        id: "PII_REDACTION",
        label: "PII redaction",
        status: "BLOCK",
        severity: "FATAL",
        action: "Redact or remove PII before export.",
        details: `${unredacted.length} finding(s) require redaction.`
      });
    } else {
      gates.push({
        id: "PII_REDACTION",
        label: "PII redaction",
        status: "PASS",
        severity: "INFO",
        action: "PII findings are redacted."
      });
    }
  } else {
    gates.push({
      id: "PII_REDACTION",
      label: "PII redaction",
      status: "PASS",
      severity: "INFO",
      action: "No PII findings detected."
    });
  }

  return { gates, serviceAttempts, piiFindings };
}
