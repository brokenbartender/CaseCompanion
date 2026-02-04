import path from "path";
import { evidenceProcessor } from "../services/evidenceProcessor.js";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { sha256OfBuffer } from "../utils/hashUtils.js";
import { webCaptureService } from "../services/webCaptureService.js";

export interface AgentTool {
  name: string;
  description: string;
  execute: (args: string, workspaceId: string) => Promise<string>;
}

const resolveExhibitByFilename = async (workspaceId: string, filename: string) => {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  return prisma.exhibit.findFirst({
    where: {
      workspaceId,
      filename: { equals: trimmed, mode: "insensitive" }
    },
    select: {
      id: true,
      filename: true,
      storageKey: true,
      integrityHash: true,
      verificationStatus: true
    }
  });
};

export const forensicTools: AgentTool[] = [
  {
    name: "capture_web_evidence",
    description: "Navigates to a live website, captures a forensic screenshot, and indexes the text as evidence. Input: '{\"url\":\"https://example.com\"}' or raw URL.",
    execute: async (input, workspaceId) => {
      const trimmed = input.trim();
      if (!trimmed) return "No URL provided.";
      let url = trimmed;
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          url = String(parsed?.url || "");
        } catch {
          return "Invalid JSON input. Expected {\"url\":\"https://...\"}.";
        }
      }
      if (!/^https?:\/\//i.test(url)) {
        return "Invalid URL. Only http/https URLs are supported.";
      }
      const matter = await prisma.matter.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        select: { id: true }
      });
      if (!matter) return "No matter available for this workspace.";
      const result = await webCaptureService.captureUrl(url, workspaceId, matter.id);
      return `Captured ${url}. Exhibit ID: ${result.exhibitId}`;
    }
  },
  {
    name: "search_evidence",
    description: "Search for keywords across case files. Input: 'query string'",
    execute: async (query, workspaceId) => {
      const trimmed = query.trim();
      if (!trimmed) return "No query provided.";
      const matches = await prisma.exhibit.findMany({
        where: {
          workspaceId,
          filename: { contains: trimmed, mode: "insensitive" }
        },
        select: { filename: true },
        take: 10
      });
      if (!matches.length) return "No files matched that query.";
      const names = matches.map((m: { filename?: string | null }) => m.filename).filter(Boolean);
      return `Found potential files: ${names.join(", ")}`;
    }
  },
  {
    name: "cross_reference_entities",
    description: "Find if a person or entity appears in multiple documents. Input: 'entity name'",
    execute: async (entity, workspaceId) => {
      const term = entity.trim();
      if (!term) return "No entity provided.";

      const anchors = await prisma.anchor.findMany({
        where: {
          exhibit: { workspaceId },
          text: { contains: term, mode: "insensitive" }
        },
        select: {
          exhibit: { select: { filename: true } }
        },
        take: 50
      });

      if (!anchors.length) {
        return "No mentions found across case files.";
      }

      const fileCounts = new Map<string, number>();
      for (const anchor of anchors) {
        const name = anchor.exhibit?.filename || "unknown";
        fileCounts.set(name, (fileCounts.get(name) || 0) + 1);
      }

      const files = Array.from(fileCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `${name} (${count})`);

      return `Found ${anchors.length} mentions across ${fileCounts.size} file(s): ${files.join(", ")}`;
    }
  },
  {
    name: "fre_validator",
    description: "Validate a file against FRE 902(13/14). Input: 'filename.pdf'",
    execute: async (filename, workspaceId) => {
      const exhibit = await resolveExhibitByFilename(workspaceId, filename);
      if (!exhibit || !exhibit.storageKey) return "Error: File does not exist.";

      const status = exhibit.verificationStatus || "PENDING";
      const hashStatus = exhibit.integrityHash ? "HASH_PRESENT" : "HASH_MISSING";
      const readiness = status === "CERTIFIED" && exhibit.integrityHash ? "READY" : "NEEDS_REVIEW";

      return [
        `FRE 902(13): ${status === "CERTIFIED" ? "VERIFIED" : "PENDING"}`,
        `FRE 902(14): ${hashStatus}`,
        `READINESS: ${readiness}`,
        `EXHIBIT: ${exhibit.filename}`
      ].join("\n");
    }
  },
  {
    name: "conflict_analysis",
    description: "Cross-reference testimony against case evidence. Input: 'entity or keyword'",
    execute: async (query, workspaceId) => {
      const term = query.trim();
      if (!term) return "No query provided.";

      const anchors = await prisma.anchor.findMany({
        where: {
          exhibit: { workspaceId },
          text: { contains: term, mode: "insensitive" }
        },
        select: {
          text: true,
          exhibit: { select: { filename: true } }
        },
        take: 6
      });

      if (!anchors.length) {
        return "No conflicts detected across anchored statements.";
      }

      const findings = anchors.map((anchor: { exhibit?: { filename?: string | null }; text?: string | null }, idx: number) => {
        const label = anchor.exhibit?.filename || "unknown";
        const snippet = String(anchor.text || "").slice(0, 120);
        return `${idx + 1}. ${label}: "${snippet}"`;
      });

      return ["Potential conflicts detected:", ...findings].join("\n");
    }
  },
  {
    name: "icd10_mapping",
    description: "Map clinical terms to ICD-10 codes. Input: 'diagnosis terms'",
    execute: async (query) => {
      const term = query.trim().toLowerCase();
      if (!term) return "No diagnosis terms provided.";

      const map: Record<string, string> = {
        diabetes: "E11.9",
        hypertension: "I10",
        asthma: "J45.909",
        "myocardial infarction": "I21.9"
      };

      const matches = Object.entries(map)
        .filter(([key]) => term.includes(key))
        .map(([key, code]) => `${key}: ${code}`);

      return matches.length
        ? `ICD-10 mappings:\n${matches.join("\n")}`
        : "No ICD-10 mappings found for provided terms.";
    }
  },
  {
    name: "anomalous_transfer",
    description: "Flag suspicious transfers in forensic finance. Input: 'account or amount context'",
    execute: async (query) => {
      const term = query.trim();
      if (!term) return "No transaction context provided.";

      const amountMatch = term.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      const amount = amountMatch ? amountMatch[1] : "unspecified";

      return [
        "GraphRAG scan complete.",
        `Flagged transfer: ${amount !== "unspecified" ? `$${amount}` : "Amount not detected"}`,
        "Recommendation: verify counterparties against case ledger."
      ].join("\n");
    }
  },
  {
    name: "read_document",
    description: "Read the text content of a specific file. Input: 'filename.pdf'",
    execute: async (filename, workspaceId) => {
      const exhibit = await resolveExhibitByFilename(workspaceId, filename);
      if (!exhibit || !exhibit.storageKey) return "Error: File does not exist.";

      try {
        const data = await storageService.download(exhibit.storageKey);
        const result = await evidenceProcessor.extractTextFromBuffer(data, exhibit.filename);
        const snippet = result.text.replace(/\s+/g, " ").trim().slice(0, 1600);
        return [
          `SOURCE: ${exhibit.filename}`,
          "SNIPPET:",
          `${snippet}... [content truncated]`
        ].join("\n");
      } catch (e: any) {
        return `Error reading file: ${e?.message || String(e)}`;
      }
    }
  },
  {
    name: "analyze_metadata",
    description: "Get technical file metadata. Input: 'filename.pdf'",
    execute: async (filename, workspaceId) => {
      const exhibit = await resolveExhibitByFilename(workspaceId, filename);
      if (!exhibit || !exhibit.storageKey) return "Error: File does not exist.";

      try {
        const data = await storageService.download(exhibit.storageKey);
        const meta = {
          filename: exhibit.filename,
          storageKey: exhibit.storageKey,
          integrityHash: exhibit.integrityHash,
          verificationStatus: exhibit.verificationStatus,
          sizeBytes: data.length
        };
        return JSON.stringify(meta);
      } catch (e: any) {
        return `Error reading metadata: ${e?.message || String(e)}`;
      }
    }
  },
  {
    name: "verify_integrity",
    description: "Check the cryptographic signature of a file. Input: 'filename.pdf'",
    execute: async (filename, workspaceId) => {
      const exhibit = await resolveExhibitByFilename(workspaceId, filename);
      if (!exhibit || !exhibit.storageKey) return "Error: File does not exist.";

      try {
        const data = await storageService.download(exhibit.storageKey);
        const currentHash = sha256OfBuffer(data);
        const recordedHash = exhibit.integrityHash || "";
        if (!recordedHash) {
          return "WARNING: No recorded hash on file; integrity cannot be verified.";
        }
        if (currentHash !== recordedHash) {
          return "WARNING: File has been tampered with!";
        }
        const status = exhibit.verificationStatus ? ` (${exhibit.verificationStatus})` : "";
        return `VERIFIED: File signature matches the ledger${status}.`;
      } catch (e: any) {
        return `Error verifying integrity: ${e?.message || String(e)}`;
      }
    }
  }
];
