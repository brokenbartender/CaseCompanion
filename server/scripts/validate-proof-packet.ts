import AdmZip from "adm-zip";
import crypto from "crypto";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { storageService } from "../storageService.js";
import { VectorStorageService } from "../services/VectorStorageService.js";
import { generateProofPacket } from "../services/packagingService.js";

const prisma = new PrismaClient();

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function safeZipName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function main() {
  const workspace = await prisma.workspace.create({ data: { name: `Proof Packet WS ${Date.now()}` } });
  const matter = await prisma.matter.create({
    data: {
      workspaceId: workspace.id,
      slug: `proof-packet-${Date.now()}`,
      name: "Proof Packet Matter",
      description: "Validation matter"
    }
  });

  const user = await prisma.user.create({
    data: {
      email: `proof-packet-${Date.now()}@lexipro.local`,
      passwordHash: crypto.randomBytes(32).toString("hex"),
      status: "ACTIVE"
    }
  });

  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "owner" }
  });

  const videoFilename = `proof-packet-video-${Date.now()}.mp4`;
  const videoBuffer = Buffer.from("000000186674797069736f6d0000000069736f6d61766331", "hex");
  const videoStorageKey = `${workspace.id}/${matter.slug}/${videoFilename}`;
  await storageService.upload(videoStorageKey, videoBuffer);

  const videoExhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: videoFilename,
      mimeType: "video/mp4",
      storageKey: videoStorageKey,
      integrityHash: sha256(videoBuffer),
      type: "VIDEO",
      mediaMetadataJson: JSON.stringify({ sha256: sha256(videoBuffer), sizeBytes: videoBuffer.length })
    }
  });

  const webFilename = `proof-packet-web-${Date.now()}.png`;
  const webBuffer = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const webStorageKey = `${workspace.id}/${matter.slug}/${webFilename}`;
  await storageService.upload(webStorageKey, webBuffer);

  await prisma.$executeRawUnsafe(`ALTER TYPE "ExhibitType" ADD VALUE IF NOT EXISTS 'WEB_CAPTURE'`);

  const webExhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: webFilename,
      mimeType: "image/png",
      storageKey: webStorageKey,
      integrityHash: sha256(webBuffer),
      type: "WEB_CAPTURE",
      mediaMetadataJson: JSON.stringify({ sha256: sha256(webBuffer), sizeBytes: webBuffer.length })
    }
  });

  const vectorStore = new VectorStorageService();
  const embedding = await vectorStore.embedText("I never saw the light.");
  const vectorLiteral = `[${embedding.join(",")}]`;
  await prisma.$executeRaw`
    INSERT INTO "TranscriptSegment"
      ("id", "exhibitId", "startTime", "endTime", "text", "speaker", "embedding", "createdAt")
    VALUES
      (${crypto.randomUUID()}, ${videoExhibit.id}, ${12.0}, ${18.0}, ${"I never saw the light."}, ${"Witness"}, ${vectorLiteral}::vector, CURRENT_TIMESTAMP)
  `;

  const payloadJson = JSON.stringify({ exhibitId: videoExhibit.id, action: "CREATE_EXHIBIT" });
  const prevHash = "GENESIS";
  const hash = sha256(`${prevHash}${user.id}CREATE_EXHIBIT${payloadJson}`);
  await prisma.auditEvent.create({
    data: {
      workspaceId: workspace.id,
      actorId: user.id,
      eventType: "EVIDENCE_CREATE",
      action: "CREATE_EXHIBIT",
      resourceId: videoExhibit.id,
      payloadJson,
      prevHash,
      hash
    }
  });

  const result = await generateProofPacket(workspace.id, matter.id);
  const zip = new AdmZip(result.buffer);

  const hashesEntry = zip.getEntry("forensic_artifacts/hashes.json");
  const auditEntry = zip.getEntry("forensic_artifacts/audit_chain.json");
  const webEntryName = `web_captures/${safeZipName(webFilename)}`;
  const webEntry = zip.getEntry(webEntryName);

  if (!hashesEntry) throw new Error("Missing hashes.json in proof packet.");
  if (!auditEntry) throw new Error("Missing audit_chain.json in proof packet.");
  if (!webEntry) throw new Error("Missing web capture PNG in proof packet.");

  const hashesJson = JSON.parse(zip.readAsText(hashesEntry));
  if (hashesJson[videoExhibit.id] !== videoExhibit.integrityHash) {
    throw new Error("hashes.json mismatch for video exhibit.");
  }
  if (hashesJson[webExhibit.id] !== webExhibit.integrityHash) {
    throw new Error("hashes.json mismatch for web exhibit.");
  }

  console.log("Proof packet validation PASS", {
    workspaceId: workspace.id,
    matterId: matter.id,
    packetBytes: result.buffer.length
  });
}

main()
  .catch((err) => {
    console.error("Proof packet validation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
