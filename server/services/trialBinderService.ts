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

export async function generateTrialBinderPacket(workspaceId: string, matterId: string) {
  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId, matterId, deletedAt: null },
    select: { id: true, filename: true, integrityHash: true, redactionStatus: true }
  });
  const piiFindings = await scanMatterForPii(workspaceId, matterId);
  const piiList = await generateProtectedPiiList(piiFindings);

  const packet = new AdmZip();
  const manifest: ManifestEntry[] = [];
  const disclaimer = [
    "# Pro Se Case Companion Trial Binder",
    "",
    "Not a lawyer. Not legal advice. Procedural help + document organization only.",
    ""
  ].join("\n");
  addFile(packet, "README.md", Buffer.from(disclaimer), manifest);

  addFile(packet, "Timeline_PLACEHOLDER.md", Buffer.from("# Timeline\n\nAdd key events and dates."), manifest);
  addFile(packet, "Exhibit_List.md", Buffer.from("# Exhibit List\n\nList exhibits with Bates numbers."), manifest);
  addFile(packet, "Witness_List.md", Buffer.from("# Witness List\n\nList witnesses and contact notes."), manifest);
  addFile(packet, "Trial_Notes.md", Buffer.from("# Trial Notes\n\nAdd trial notes, questions, and objections."), manifest);

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
