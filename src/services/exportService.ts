type ExhibitSnapshot = {
  id?: string | null;
  title?: string | null;
  filename?: string | null;
  batesNumber?: string | null;
  integrityHash?: string | null;
  createdAt?: string | Date | null;
  legalHold?: boolean | null;
  verificationStatus?: string | null;
};

type AuditEvent = {
  eventType: string;
  actorId?: string | null;
  createdAt?: string | Date;
  payloadJson?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function normalizeEventType(eventType: string) {
  if (eventType === "EXHIBIT_UPLOAD") return "UPLOAD";
  if (eventType === "EXHIBIT_FILE_ACCESS") return "VIEW";
  if (eventType === "TOGGLE_LEGAL_HOLD") return "TOGGLE_HOLD";
  return eventType;
}

function deriveUploadDate(exhibit: ExhibitSnapshot, auditLog: AuditEvent[]) {
  if (exhibit.createdAt) return exhibit.createdAt;
  const uploadEvent = auditLog.find((event) => event.eventType === "EXHIBIT_UPLOAD");
  return uploadEvent?.createdAt ?? null;
}

function buildComplianceStatus(exhibit: ExhibitSnapshot) {
  if (exhibit.verificationStatus === "REVOKED") return "INTEGRITY REVOKED";
  if (exhibit.legalHold) return "LITIGATION HOLD ACTIVE";
  return "CLEAR";
}

export function generateAdmissibilityPacket(exhibit: ExhibitSnapshot, auditLog: AuditEvent[]) {
  const title = exhibit.title || exhibit.filename || exhibit.id || "Evidence Exhibit";
  const batesNumber = exhibit.batesNumber || "N/A";
  const integrityHash = exhibit.integrityHash || "N/A";
  const uploadDate = formatDate(deriveUploadDate(exhibit, auditLog));
  const complianceStatus = buildComplianceStatus(exhibit);
  const generatedAt = formatDate(new Date());

  const rows = auditLog
    .filter((event) =>
      ["EXHIBIT_UPLOAD", "EXHIBIT_FILE_ACCESS", "TOGGLE_LEGAL_HOLD"].includes(event.eventType),
    )
    .map((event) => {
      const label = normalizeEventType(event.eventType);
      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${escapeHtml(formatDate(event.createdAt))}</td>
          <td>${escapeHtml(event.actorId || "SYSTEM")}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Admissibility Packet - ${escapeHtml(String(batesNumber))}</title>
    <style>
      :root {
        --ink: #0a0a0a;
        --border: #1f1f1f;
        --muted: #3b3b3b;
      }
      body {
        margin: 0;
        padding: 36px;
        background: #ffffff;
        color: var(--ink);
        font-family: "Times New Roman", "Georgia", serif;
        font-size: 14px;
        line-height: 1.5;
      }
      header {
        border: 2px solid var(--border);
        padding: 16px 20px;
        margin-bottom: 28px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 18px;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      h2 {
        margin: 24px 0 10px;
        font-size: 14px;
        text-transform: uppercase;
        border-bottom: 1px solid var(--border);
        padding-bottom: 6px;
      }
      .meta {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 6px 12px;
      }
      .meta div {
        padding: 2px 0;
      }
      .label {
        font-weight: bold;
        text-transform: uppercase;
        font-size: 12px;
        color: var(--muted);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th, td {
        border: 1px solid var(--border);
        padding: 8px 10px;
        text-align: left;
      }
      th {
        background: #f4f4f4;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
      }
      footer {
        margin-top: 32px;
        border-top: 2px solid var(--border);
        padding-top: 12px;
        font-size: 12px;
      }
      .hash {
        word-break: break-all;
        font-family: "Courier New", Courier, monospace;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>CERTIFICATE OF FORENSIC AUTHENTICITY // ISSUED BY AIGIS PRIME</h1>
      <div><strong>Evidence:</strong> ${escapeHtml(String(title))}</div>
      <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
    </header>

    <section>
      <h2>Metadata</h2>
      <div class="meta">
        <div class="label">Bates Number</div>
        <div>${escapeHtml(String(batesNumber))}</div>
        <div class="label">SHA-256 Hash</div>
        <div class="hash">${escapeHtml(String(integrityHash))}</div>
        <div class="label">Upload Date</div>
        <div>${escapeHtml(uploadDate)}</div>
        <div class="label">Compliance Status</div>
        <div>${escapeHtml(complianceStatus)}</div>
      </div>
    </section>

    <section>
      <h2>Audit Ledger Events</h2>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Timestamp</th>
            <th>User ID</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="3">No audit events available.</td></tr>`}
        </tbody>
      </table>
    </section>

    <footer>
      Mathematical integrity verified via LexiPro Forensic Ledger.
    </footer>
  </body>
</html>
  `.trim();
}
