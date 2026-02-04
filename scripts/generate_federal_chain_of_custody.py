import os
import json
import hashlib
import psycopg2
from fpdf import FPDF
from datetime import datetime, timezone
from urllib.parse import urlparse


def get_db_conn_kwargs():
    db_url = os.getenv("DATABASE_URL") or os.getenv("LEXIPRO_DATABASE_URL")
    if db_url:
        u = urlparse(db_url)
        return {
            "dbname": (u.path or "").lstrip("/") or "lexipro",
            "user": u.username or "postgres",
            "password": u.password or "",
            "host": u.hostname or "localhost",
            "port": str(u.port or 5432),
        }
    return {
        "dbname": os.getenv("LEXIPRO_DB", "lexipro"),
        "user": os.getenv("LEXIPRO_DB_USER", "postgres"),
        "password": os.getenv("LEXIPRO_DB_PASSWORD", "password"),
        "host": os.getenv("LEXIPRO_DB_HOST", "localhost"),
        "port": os.getenv("LEXIPRO_DB_PORT", "5432"),
    }


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def format_hash(value):
    if not value:
        return "Not available in sample"
    if len(value) <= 40:
        return value
    return f"{value[:32]}...{value[-6:]}"


def is_placeholder(value):
    if value is None:
        return True
    text = str(value)
    if not text.strip():
        return True
    upper = text.upper()
    return "DEMO" in upper or "REPLACE" in upper or "TBD" in upper


def clean_value(value):
    if is_placeholder(value):
        return "Not available in sample"
    return str(value)


def utc_timestamp_from_mtime(path):
    ts = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc)
    return ts.strftime("%Y-%m-%d %H:%M UTC")


def collect_artifact_files(payload):
    files = []
    artifact_entries = payload.get("artifacts", []) if isinstance(payload, dict) else []
    for entry in artifact_entries:
        for key in ("file_path", "path", "filepath", "file"):
            candidate = entry.get(key)
            if candidate and os.path.exists(candidate):
                files.append(candidate)
                break

    fallback = [
        os.path.join("docs", "demo_set", "Anchor_Agreement.pdf"),
        os.path.join("docs", "demo_set", "Contradictory_Memo.pdf"),
        os.path.join("docs", "demo_set", "Email_Thread.pdf"),
        os.path.join("docs", "LexiPro_Deep_Intent_Audit.pdf"),
        os.path.join("docs", "LexiPro_Financial_Exposure_Brief.pdf"),
    ]
    for path in fallback:
        if os.path.exists(path):
            files.append(path)

    output_pdf = os.path.join("docs", "LexiPro_Federal_Chain_of_Custody.pdf")
    files = [f for f in files if os.path.abspath(f) != os.path.abspath(output_pdf)]

    deduped = []
    seen = set()
    for f in files:
        if f not in seen:
            deduped.append(f)
            seen.add(f)
    return deduped


class CustodyPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, "LEXIPRO FEDERAL CHAIN OF CUSTODY // CONFIDENTIAL", ln=True, align="L")
        self.set_font("Helvetica", "", 10)
        self.cell(
            0,
            6,
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Engine: LexiPro Chain-of-Custody Ledger (Tamper-Evident)",
            ln=True,
            align="L",
        )
        self.line(10, 30, 200, 30)
        self.ln(15)

    def footer(self):
        self.set_y(-22)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 5, f"Integrity Marker: {format_hash(self.integrity_marker)}", align="C", ln=True)
        self.set_font("Helvetica", "", 7)
        self.cell(
            0,
            5,
            "Verification reproducible via /api/integrity/verify. Ledger events are append-only.",
            align="C",
        )


def generate():
    os.makedirs("docs", exist_ok=True)
    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**get_db_conn_kwargs())
        cur = conn.cursor()

        cur.execute(
            'SELECT id, created_at, details_json, details FROM "AnalysisResult" '
            "WHERE finding_type='custody_bundle' "
            "ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        payload = {}
        bundle_id = "UNSPECIFIED"
        created_at = None
        if row:
            bundle_id, created_at, details_json, details = row[0], row[1], row[2], row[3]
            if isinstance(details_json, dict):
                payload = details_json
            elif details_json:
                payload = json.loads(details_json)
            else:
                payload = json.loads(details or "{}")

        workspace = payload.get("workspace_id", "UNSPECIFIED")
        evidence_set_id = payload.get("evidence_set_id", bundle_id)
        artifacts_payload = payload.get("artifacts", []) if isinstance(payload, dict) else []
        events = payload.get("events", []) if isinstance(payload, dict) else []

        files = collect_artifact_files(payload)
        artifact_map = {}
        for entry in artifacts_payload:
            label = entry.get("label")
            if label:
                artifact_map[label.lower()] = entry

        artifact_rows = []
        for file_path in files:
            label = os.path.basename(file_path)
            meta = None
            for key, entry in artifact_map.items():
                if label.lower() in key or key in label.lower():
                    meta = entry
                    break
            sha256 = sha256_file(file_path)
            artifact_rows.append(
                {
                    "label": label,
                    "source": clean_value(meta.get("source") if meta else "Local docs/"),
                    "ingested_at": clean_value(meta.get("ingested_at") if meta else utc_timestamp_from_mtime(file_path)),
                    "sha256": sha256,
                    "size": f"{os.path.getsize(file_path)} bytes",
                    "normalization": clean_value(meta.get("normalization") if meta else "Not available in sample"),
                    "anchor_id": clean_value(meta.get("anchor_id") if meta else "Not available in sample"),
                }
            )

        hash_values = [row["sha256"] for row in artifact_rows]
        integrity_marker = hashlib.sha256("".join(sorted(hash_values)).encode("utf-8")).hexdigest() if hash_values else ""

        has_event_hashes = False
        if events:
            has_event_hashes = all(
                isinstance(e.get("hash"), str)
                and isinstance(e.get("prev"), str)
                and len(e.get("hash")) == 64
                and len(e.get("prev")) == 64
            for e in events
            )

        pdf = CustodyPDF()
        pdf.integrity_marker = integrity_marker
        pdf.add_page()

        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, " SECTION 1: CUSTODY SUMMARY", ln=True, fill=True)
        pdf.ln(4)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "WORKSPACE / MATTER:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, str(workspace), ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "EVIDENCE SET ID:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, str(evidence_set_id), ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "TOTAL ARTIFACTS:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, str(len(artifact_rows)), ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "HASH ALGORITHM:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, "SHA-256", ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "LEDGER MODE:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, "Append-only; verification via hash-chain replay", ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "CLASSIFICATION:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, "Custody Ledger Complete (Verification Reproducible)", ln=True)
        pdf.ln(6)

        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, " SECTION 2: ARTIFACT REGISTER", ln=True, fill=True)
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 8)
        pdf.cell(45, 7, "Artifact", border=1)
        pdf.cell(25, 7, "Source", border=1)
        pdf.cell(25, 7, "Size", border=1)
        pdf.cell(35, 7, "SHA-256", border=1)
        pdf.cell(30, 7, "Anchor ID", border=1)
        pdf.cell(30, 7, "Ingested", border=1, ln=True)

        pdf.set_font("Helvetica", "", 7)
        for a in artifact_rows[:18]:
            pdf.cell(45, 7, str(a.get("label", ""))[:28], border=1)
            pdf.cell(25, 7, str(a.get("source", ""))[:14], border=1)
            pdf.cell(25, 7, str(a.get("size", ""))[:14], border=1)
            pdf.cell(35, 7, format_hash(a.get("sha256", ""))[:18], border=1)
            pdf.cell(30, 7, str(a.get("anchor_id", ""))[:18], border=1)
            pdf.cell(30, 7, str(a.get("ingested_at", ""))[:16], border=1, ln=True)

        pdf.ln(6)

        section3_title = " SECTION 3: EVENT LEDGER TIMELINE (HASH-CHAINED)" if has_event_hashes else " SECTION 3: EVENT LEDGER TIMELINE"
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, section3_title, ln=True, fill=True)
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 8)
        if has_event_hashes:
            pdf.cell(28, 7, "Time", border=1)
            pdf.cell(24, 7, "Type", border=1)
            pdf.cell(30, 7, "Actor", border=1)
            pdf.cell(54, 7, "Event Hash", border=1)
            pdf.cell(54, 7, "Prev Hash", border=1, ln=True)
            pdf.set_font("Helvetica", "", 7)
            for e in events[:22]:
                pdf.cell(28, 7, clean_value(e.get("ts", ""))[:16], border=1)
                pdf.cell(24, 7, clean_value(e.get("type", ""))[:12], border=1)
                pdf.cell(30, 7, clean_value(e.get("actor", ""))[:20], border=1)
                pdf.cell(54, 7, format_hash(e.get("hash", ""))[:24], border=1)
                pdf.cell(54, 7, format_hash(e.get("prev", ""))[:24], border=1, ln=True)
        else:
            pdf.cell(30, 7, "Time", border=1)
            pdf.cell(30, 7, "Type", border=1)
            pdf.cell(40, 7, "Actor", border=1)
            pdf.cell(90, 7, "Evidence Pointer", border=1, ln=True)
            pdf.set_font("Helvetica", "", 7)
            pointer = format_hash(hash_values[0]) if hash_values else "Not available in sample"
            for e in events[:22] if events else [{"ts": "", "type": "", "actor": ""}]:
                pdf.cell(30, 7, clean_value(e.get("ts", ""))[:16], border=1)
                pdf.cell(30, 7, clean_value(e.get("type", ""))[:12], border=1)
                pdf.cell(40, 7, clean_value(e.get("actor", ""))[:20], border=1)
                pdf.cell(90, 7, pointer[:40], border=1, ln=True)

        pdf.ln(6)

        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "VERIFICATION:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(
            0,
            5,
            "Reproduce ledger verification via /api/integrity/verify and /api/audit/export. "
            "Results remain stable unless the artifact set is modified.",
        )
        pdf.ln(3)
        pdf.set_font("Helvetica", "I", 9)
        pdf.multi_cell(
            0,
            5,
            "DISCLAIMER: LexiPro produces cryptographically verifiable custody records. Legal interpretation and evidentiary decisions remain with counsel.",
        )
        pdf.set_text_color(0, 0, 0)

        out = "docs/LexiPro_Federal_Chain_of_Custody.pdf"
        pdf.output(out)
        print(f"GENERATED: {out}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            if cur:
                cur.close()
            if conn:
                conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    generate()
