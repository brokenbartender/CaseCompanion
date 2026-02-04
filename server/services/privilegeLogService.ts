import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { prisma } from "../lib/prisma.js";

export type PrivilegeLogRow = {
  exhibitId: string;
  filename: string;
  batesNumber: string | null;
  privilegeTag: string;
  privilegeType: string;
  documentType: string;
  createdAt: string;
};

export async function getPrivilegeLogRows(args: {
  workspaceId: string;
  matterId: string;
  privilegeType?: string | null;
}) {
  const privilegeType = args.privilegeType ? String(args.privilegeType).toUpperCase() : null;
  const exhibits = await prisma.exhibit.findMany({
    where: {
      workspaceId: args.workspaceId,
      matterId: args.matterId,
      deletedAt: null,
      privilegePending: false,
      ...(privilegeType && privilegeType !== "ALL" ? { privilegeType } : {}),
      OR: [
        { documentType: "PRIVILEGED" },
        { privilegeTag: { not: "NONE" } },
        { privilegeType: { not: "NONE" } }
      ]
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      filename: true,
      batesNumber: true,
      privilegeTag: true,
      privilegeType: true,
      documentType: true,
      createdAt: true
    }
  });

  return exhibits.map((ex) => ({
    exhibitId: ex.id,
    filename: ex.filename,
    batesNumber: ex.batesNumber,
    privilegeTag: ex.privilegeTag,
    privilegeType: ex.privilegeType,
    documentType: ex.documentType,
    createdAt: ex.createdAt.toISOString()
  })) as PrivilegeLogRow[];
}

export async function renderPrivilegeLogPdf(rows: PrivilegeLogRow[], matterName: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 54;
  const pageSize: [number, number] = [612, 792];
  let page = pdf.addPage(pageSize);
  let y = pageSize[1] - margin;

  const drawLine = (text: string, size = 10) => {
    if (y < margin) {
      page = pdf.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    page.drawText(text, { x: margin, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  page.drawText("Privilege Log", { x: margin, y, size: 18, font: titleFont, color: rgb(0, 0, 0) });
  y -= 24;
  drawLine(`Matter: ${matterName || "Matter"}`, 11);
  drawLine(`Generated: ${new Date().toISOString()}`, 10);
  y -= 6;
  drawLine("Index | Bates | Document | Privilege Type | Privilege Tag", 10);
  drawLine("------------------------------------------------------------", 10);

  rows.forEach((row, idx) => {
    const line = `${idx + 1}. ${row.batesNumber || "N/A"} | ${truncate(row.filename, 32)} | ${row.privilegeType} | ${row.privilegeTag}`;
    drawLine(line, 10);
  });

  return Buffer.from(await pdf.save());
}

export function renderPrivilegeLogXlsx(rows: PrivilegeLogRow[]) {
  const data = rows.map((row, idx) => ({
    Index: idx + 1,
    ExhibitId: row.exhibitId,
    Filename: row.filename,
    BatesNumber: row.batesNumber || "",
    PrivilegeTag: row.privilegeTag,
    PrivilegeType: row.privilegeType,
    DocumentType: row.documentType,
    CreatedAt: row.createdAt
  }));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Privilege Log");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function truncate(value: string, limit: number) {
  const str = String(value || "");
  if (str.length <= limit) return str;
  return `${str.slice(0, Math.max(0, limit - 3))}...`;
}
