import dotenv from "dotenv";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { logAuditEvent } from "../audit.js";
import { generateUnassailablePacket } from "../services/packagingService.js";
import { generateSalesWinningPDF } from "../services/exportService.js";

dotenv.config({ path: "server/.env" });

const db = new PrismaClient();

function sha256(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const workspace = await db.workspace.findFirst({ where: { name: "State v. Nexus" } });
  if (!workspace) throw new Error("State v. Nexus workspace not found");
  const matter = await db.matter.findFirst({ where: { workspaceId: workspace.id, slug: "state-v-nexus" } });
  if (!matter) throw new Error("State v. Nexus matter not found");

  const packet = await generateUnassailablePacket(workspace.id, matter.id);
  const pdf = await generateSalesWinningPDF(matter.id);

  let user = await db.user.findFirst({ where: { email: "demo@lexipro.local" } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: `demo@lexipro.local`,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        status: "ACTIVE"
      }
    });
  }

  await logAuditEvent(workspace.id, user.id, "FINAL_EXPORT", {
    matterId: matter.id,
    pdfHash: pdf.metadata.pdfHash,
    generatedAt: pdf.metadata.generatedAt
  });

  const zip = new AdmZip();
  zip.addFile(`metadata_${matter.id}.zip`, packet.buffer);
  zip.addFile(`LexiPro_Forensic_Report_${matter.id}.pdf`, pdf.buffer);

  const buffer = zip.toBuffer();
  const readZip = new AdmZip(buffer);
  const pdfEntry = readZip.getEntries().find((entry) => entry.entryName.endsWith(".pdf"));
  if (!pdfEntry) throw new Error("PDF missing from final export");

  const pdfBytes = pdfEntry.getData();
  if (!pdfBytes || pdfBytes.length === 0) throw new Error("PDF is empty");

  const pdfText = pdfBytes.toString("latin1");
  if (!pdfText.includes("local gemma:2b")) {
    throw new Error("PDF missing model badge text 'local gemma:2b'");
  }

  const auditEvent = await db.auditEvent.findFirst({
    where: { workspaceId: workspace.id, eventType: "FINAL_EXPORT" },
    orderBy: { createdAt: "desc" }
  });
  if (!auditEvent) throw new Error("AuditEvent FINAL_EXPORT not found");

  const expectedHash = sha256(pdf.buffer);
  if (auditEvent.payloadJson && !auditEvent.payloadJson.includes(expectedHash)) {
    throw new Error("AuditEvent FINAL_EXPORT missing pdf hash");
  }

  console.log("Final delivery validation PASS", {
    workspaceId: workspace.id,
    matterId: matter.id,
    pdfBytes: pdfBytes.length
  });
}

main()
  .catch((err) => {
    console.error("Final delivery validation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
