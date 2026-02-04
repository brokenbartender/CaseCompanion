import crypto from "crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../lib/prisma.js";
import { storageService } from "../storageService.js";
import { IngestionPipeline } from "./IngestionPipeline.js";

export type ExternalDoc = {
  id: string;
  filename: string;
  mimeType: string;
};

export interface DataSource {
  listDocuments(): Promise<ExternalDoc[]>;
  download(id: string): Promise<Buffer>;
}

class MockClioProvider implements DataSource {
  private docs: Array<{ id: string; filename: string; mimeType: string; content: Buffer }>;

  constructor() {
    this.docs = [];
  }

  async listDocuments(): Promise<ExternalDoc[]> {
    if (!this.docs.length) {
      this.docs = [
        {
          id: "clio-demo-1",
          filename: "clio-demo-contract.pdf",
          mimeType: "application/pdf",
          content: await buildMockPdf([
            "Mock Clio Contract",
            "Response due within 10 days."
          ])
        },
        {
          id: "clio-demo-2",
          filename: "clio-demo-notice.pdf",
          mimeType: "application/pdf",
          content: await buildMockPdf([
            "Mock Clio Notice",
            "Payment due by Jan 15, 2027."
          ])
        }
      ];
    }
    return this.docs.map((doc) => ({ id: doc.id, filename: doc.filename, mimeType: doc.mimeType }));
  }

  async download(id: string): Promise<Buffer> {
    const doc = this.docs.find((entry) => entry.id === id);
    if (!doc) throw new Error(`External document not found: ${id}`);
    return doc.content;
  }
}

function getProvider(type: string): DataSource {
  switch (type) {
    case "CLIO":
      return new MockClioProvider();
    default:
      throw new Error(`Unsupported integration type: ${type}`);
  }
}

async function ensureIntegrationMatter(workspaceId: string) {
  const slug = "integrations";
  const existing = await prisma.matter.findFirst({ where: { workspaceId, slug } });
  if (existing) return existing;
  return prisma.matter.create({
    data: {
      workspaceId,
      slug,
      name: "Integrations",
      description: "External connector imports"
    }
  });
}

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function buildMockPdf(lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 72, y, size: 12, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

export const integrationService = {
  async syncWorkspace(integrationId: string) {
    const integration = await prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error("Integration not found");

    const provider = getProvider(String(integration.type));
    const docs = await provider.listDocuments();
    const matter = await ensureIntegrationMatter(integration.workspaceId);
    const ingestion = new IngestionPipeline();

    let imported = 0;
    for (const doc of docs) {
      const existing = await prisma.externalResource.findFirst({
        where: { integrationId: integration.id, externalId: doc.id }
      });
      if (existing) continue;

      const bytes = await provider.download(doc.id);
      const storageKey = `${integration.workspaceId}/${matter.slug}/external-${doc.id}-${Date.now()}`;
      await storageService.upload(storageKey, bytes);

      const exhibit = await prisma.exhibit.create({
        data: {
          workspaceId: integration.workspaceId,
          matterId: matter.id,
          filename: doc.filename,
          mimeType: doc.mimeType,
          storageKey,
          integrityHash: sha256(bytes)
        }
      });

      await prisma.externalResource.create({
        data: {
          workspaceId: integration.workspaceId,
          integrationId: integration.id,
          exhibitId: exhibit.id,
          externalId: doc.id
        }
      });

      await ingestion.ingestExhibit(integration.workspaceId, exhibit.id);
      imported += 1;
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSync: new Date(), status: "ACTIVE" }
    });

    return { imported, total: docs.length };
  }
};
