import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { storageService } from '../storageService.js';
import { logAuditEvent } from '../audit.js';
import { signPayload } from '../utils/signing.js';

export class BatesProductionError extends Error {
  code: 'NO_EXHIBITS_SELECTED' | 'EXHIBIT_NOT_FOUND' | 'NON_PDF_EXHIBIT' | 'BATES_CONFLICT';

  constructor(code: BatesProductionError['code']) {
    super(code);
    this.code = code;
    this.name = 'BatesProductionError';
  }
}

function formatBates(prefix: string, counter: number) {
  return `${prefix}${String(counter).padStart(6, '0')}`;
}

async function reserveBatesRange(args: {
  workspaceId: string;
  userId: string;
  prefix: string;
  startNumber: number;
  count: number;
}) {
  const { workspaceId, userId, prefix, startNumber, count } = args;
  const issuedAt = new Date().toISOString();
  const payload = {
    workspaceId,
    prefix,
    startNumber,
    endNumber: startNumber + count - 1,
    issuedAt
  };
  const certificate = signPayload(JSON.stringify(payload));
  const reservations = Array.from({ length: count }, (_, idx) => ({
    number: startNumber + idx,
    id: crypto.createHash('md5').update(`${workspaceId}:${prefix}:${startNumber + idx}:${issuedAt}`).digest('hex')
  }));

  try {
    await prisma.$transaction(async (tx: any) => {
      for (const entry of reservations) {
        await tx.$executeRaw`
          INSERT INTO "BatesReservation"
          ("id", "workspaceId", "prefix", "number", "reservedBy", "certificate", "createdAt")
          VALUES
          (${entry.id}, ${workspaceId}, ${prefix}, ${entry.number}, ${userId}, ${certificate}, CURRENT_TIMESTAMP)
        `;
      }
    });
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('batesreservation_prefix_number_key')) {
      throw new BatesProductionError('BATES_CONFLICT');
    }
    throw err;
  }

  return { certificate, issuedAt };
}

export async function generateBatesProductionSet(args: {
  workspaceId: string;
  userId: string;
  exhibitIds: string[];
  prefix: string;
  startNumber: number;
}) {
  const { workspaceId, userId, exhibitIds, prefix, startNumber } = args;
  if (!exhibitIds.length) {
    throw new BatesProductionError('NO_EXHIBITS_SELECTED');
  }

  const exhibits = await prisma.exhibit.findMany({
    where: {
      id: { in: exhibitIds },
      workspaceId,
      deletedAt: null
    },
    select: { id: true, storageKey: true, filename: true, mimeType: true, documentType: true, privilegePending: true, privilegeType: true }
  });

  const exhibitById = new Map(exhibits.map((ex: any) => [ex.id, ex]));
  const ordered = exhibitIds.map((id) => exhibitById.get(id)).filter(Boolean) as typeof exhibits;
  if (ordered.length !== exhibitIds.length) {
    throw new BatesProductionError('EXHIBIT_NOT_FOUND');
  }

  const isWithheld = (exhibit: any) =>
    String(exhibit?.documentType || '').toUpperCase() === 'PRIVILEGED' || Boolean(exhibit?.privilegePending);
  const withheldExhibits = ordered.filter((ex) => isWithheld(ex));
  const sourceDocs: Array<{ exhibitId: string; doc: PDFDocument; filename: string }> = [];
  let totalPages = withheldExhibits.length;
  for (const ex of ordered) {
    if (isWithheld(ex)) continue;
    if (!ex.mimeType || !ex.mimeType.includes('pdf')) {
      throw new BatesProductionError('NON_PDF_EXHIBIT');
    }
    const bytes = await storageService.download(ex.storageKey);
    const sourceDoc = await PDFDocument.load(bytes);
    totalPages += sourceDoc.getPageCount();
    sourceDocs.push({ exhibitId: ex.id, doc: sourceDoc, filename: ex.filename || 'Exhibit' });
  }

  const reservation = await reserveBatesRange({
    workspaceId,
    userId,
    prefix,
    startNumber,
    count: totalPages
  });

  const output = await PDFDocument.create();
  const stampFont = await output.embedFont(StandardFonts.Courier);
  const placeholderFont = await output.embedFont(StandardFonts.HelveticaBold);
  let counter = startNumber;

  const sourceById = new Map(sourceDocs.map((entry) => [entry.exhibitId, entry]));
  for (const ex of ordered) {
    if (isWithheld(ex)) {
      const placeholder = output.addPage([612, 792]);
      const { width, height } = placeholder.getSize();
      const label = `WITHHELD - PRIVILEGED`;
      const subtitle = `Exhibit ${ex.id} • ${ex.filename || 'Document'}`;
      placeholder.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1)
      });
      placeholder.drawText(label, {
        x: 72,
        y: height / 2 + 24,
        size: 22,
        font: placeholderFont,
        color: rgb(0, 0, 0)
      });
      placeholder.drawText(subtitle, {
        x: 72,
        y: height / 2 - 8,
        size: 12,
        font: placeholderFont,
        color: rgb(0.1, 0.1, 0.1)
      });
      const stampText = formatBates(prefix, counter);
      placeholder.drawText(stampText, {
        x: width - 140,
        y: 20,
        size: 10,
        font: stampFont,
        color: rgb(0, 0, 0)
      });
      counter += 1;
      continue;
    }

    const entry = sourceById.get(ex.id);
    if (!entry) continue;
    const pages = await output.copyPages(entry.doc, entry.doc.getPageIndices());
    for (const page of pages) {
      output.addPage(page);
      const { width, height } = page.getSize();
      const stampText = formatBates(prefix, counter);
      page.drawText(stampText, {
        x: width - 140,
        y: 20,
        size: 10,
        font: stampFont,
        color: rgb(0, 0, 0)
      });
      counter += 1;
    }
  }

  const pdfBytes = await output.save();
  const storageKey = `productions/${workspaceId}/bates-${Date.now()}.pdf`;
  await storageService.upload(storageKey, Buffer.from(pdfBytes));

  await logAuditEvent(workspaceId, userId, 'BATES_PRODUCTION_GENERATED', {
    exhibitIds,
    withheldExhibitIds: withheldExhibits.map((ex) => ex.id),
    storageKey,
    prefix,
    startNumber,
    endNumber: counter - 1,
    totalPages,
    reservationCertificate: reservation.certificate
  });

  return {
    storageKey,
    totalPages,
    startNumber,
    endNumber: counter - 1,
    withheldExhibitIds: withheldExhibits.map((ex) => ex.id),
    reservationCertificate: reservation.certificate,
    reservationIssuedAt: reservation.issuedAt
  };
}
