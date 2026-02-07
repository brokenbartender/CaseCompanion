import AdmZip from "adm-zip";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { generateProtectedPiiList, scanMatterForPii } from "./piiScanService.js";

type ManifestEntry = {
  path: string;
  sha256: string;
  size: number;
};

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function addFile(zip: AdmZip, path: string, buffer: Buffer, manifest: ManifestEntry[]) {
  zip.addFile(path, buffer);
  manifest.push({ path, sha256: sha256(buffer), size: buffer.length });
}

export async function generateServicePacket(workspaceId: string, matterId: string) {
  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId, matterId, deletedAt: null },
    select: { id: true, filename: true, integrityHash: true, redactionStatus: true }
  });
  const piiFindings = await scanMatterForPii(workspaceId, matterId);
  const piiList = await generateProtectedPiiList(piiFindings);

  const packet = new AdmZip();
  const manifest: ManifestEntry[] = [];
  const disclaimer = [
    "# Pro Se Case Companion Service Packet",
    "",
    "Not a lawyer. Not legal advice. Procedural help + document organization only.",
    ""
  ].join("\n");
  addFile(packet, "README.md", Buffer.from(disclaimer), manifest);

  addFile(
    packet,
    "Summons_PLACEHOLDER.md",
    Buffer.from("# Summons\n\nAttach issued summons for service."),
    manifest
  );
  addFile(
    packet,
    "Complaint_PLACEHOLDER.md",
    Buffer.from("# Complaint\n\nAttach complaint for service."),
    manifest
  );
  addFile(
    packet,
    "Instructions.md",
    Buffer.from(
      "# Service Instructions\n\nInclude service instructions and proof-of-service forms required by your court."
    ),
    manifest
  );
  addFile(
    packet,
    "Proof_of_Service_PLACEHOLDER.md",
    Buffer.from("# Proof of Service\n\nAttach completed proof of service after service is complete."),
    manifest
  );

  const exhibitIndex = exhibits.map((exhibit, index) => ({
    order: index + 1,
    exhibitId: exhibit.id,
    filename: exhibit.filename,
    hash: exhibit.integrityHash,
    redactionStatus: exhibit.redactionStatus
  }));
  addFile(packet, "Exhibits_Index.json", Buffer.from(JSON.stringify(exhibitIndex, null, 2)), manifest);
  addFile(packet, "MC97_Protected_PII_List.json", Buffer.from(JSON.stringify(piiList.json, null, 2)), manifest);

  addFile(packet, "manifest.json", Buffer.from(JSON.stringify({
    generatedAt: new Date().toISOString(),
    workspaceId,
    matterId,
    files: manifest
  }, null, 2)), manifest);

  return {
    buffer: packet.toBuffer(),
    manifest,
    piiFindings
  };
}
