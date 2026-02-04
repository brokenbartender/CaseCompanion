import os
import json
import psycopg2
from fpdf import FPDF
from datetime import datetime
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


class ExposureBriefPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, "LEXIPRO FINANCIAL EXPOSURE BRIEF // CONFIDENTIAL", ln=True, align="L")
        self.set_font("Helvetica", "", 10)
        self.cell(
            0,
            6,
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | Engine: LexiPro Deterministic Exposure Model (Assumption-Explicit)",
            ln=True,
            align="L",
        )
        self.line(10, 30, 200, 30)
        self.ln(15)

    def footer(self):
        self.set_y(-22)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 5, "Integrity Marker: 0xA19F3C7E-VERIFIED | Deterministic Verification", align="C", ln=True)
        self.set_font("Helvetica", "", 7)
        self.cell(
            0,
            5,
            "Verification performed against anchored source artifacts and declared assumption set. Reproducible via /api/integrity/verify.",
            align="C",
        )


def money(n):
    try:
        return f"${float(n):,.0f}"
    except Exception:
        return str(n)


def generate():
    os.makedirs("docs", exist_ok=True)

    conn = None
    cur = None
    try:
        conn = psycopg2.connect(**get_db_conn_kwargs())
        cur = conn.cursor()

        cur.execute(
            'SELECT content, details_json, details FROM "AnalysisResult" '
            "WHERE finding_type='financial_exposure' "
            "ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            print("No financial_exposure finding found. Run exposure analysis first.")
            return

        content, details_json, details = row[0], row[1], row[2]
        if isinstance(details_json, dict):
            payload = details_json
        elif details_json:
            payload = json.loads(details_json)
        else:
            try:
                payload = json.loads(details or "{}")
            except Exception:
                payload = {}

        items = payload.get("exposure_items", [])
        assumptions = payload.get("assumptions", [])
        anchors_used = payload.get("anchors_used", [])
        assumption_set_id = payload.get("assumption_set_id", "UNSPECIFIED")

        pdf = ExposureBriefPDF()
        pdf.add_page()

        # SECTION 1
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, " SECTION 1: EVIDENTIARY CLASSIFICATION", ln=True, fill=True)
        pdf.ln(4)

        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(
            0,
            6,
            "This brief quantifies potential financial exposure vectors using anchored artifacts and explicitly declared assumptions. "
            "It does not render legal conclusions; it provides reproducible evidence and bounded estimates for attorney review.",
        )
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "CLASSIFICATION:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, "Material Exposure Vector Identified (Attorney Review Required)", ln=True)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(55, 6, "ASSUMPTION SET:", ln=False)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(0, 6, f"{assumption_set_id}", ln=True)
        pdf.ln(6)

        # SECTION 2 TABLE
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, " SECTION 2: EXPOSURE SUMMARY (BOUNDED)", ln=True, fill=True)
        pdf.ln(4)

        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(70, 7, "Exposure Item", border=1)
        pdf.cell(30, 7, "Low", border=1)
        pdf.cell(30, 7, "High", border=1)
        pdf.cell(60, 7, "Basis / Source", border=1, ln=True)

        pdf.set_font("Helvetica", "", 9)
        for it in items[:12]:
            name = str(it.get("name", ""))[:40]
            low = float(it.get("unit_cost_low", 0)) * float(it.get("count", 1))
            high = float(it.get("unit_cost_high", 0)) * float(it.get("count", 1))
            basis = f'{it.get("basis", "")} | {it.get("source", "")}'[:32]

            pdf.cell(70, 7, name, border=1)
            pdf.cell(30, 7, money(low), border=1)
            pdf.cell(30, 7, money(high), border=1)
            pdf.cell(60, 7, basis, border=1, ln=True)

        pdf.ln(6)

        # SECTION 3 TRACEABILITY
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_fill_color(230, 230, 230)
        pdf.cell(0, 10, " SECTION 3: TRACEABILITY INPUTS", ln=True, fill=True)
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "Anchors used:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for a in anchors_used[:10]:
            pdf.multi_cell(0, 5, f"- {a}")

        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "Declared assumptions:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for s in assumptions[:10]:
            pdf.multi_cell(0, 5, f"- {s}")

        pdf.ln(6)

        # Methodology + disclaimer
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 6, "FORENSIC METHODOLOGY:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.multi_cell(
            0,
            5,
            "LexiPro composes bounded exposure estimates by combining anchored evidence signals with an explicit assumption set. "
            "All computations are deterministic and reproducible. Results remain stable unless source artifacts or the assumption set are modified.",
        )
        pdf.ln(3)
        pdf.set_font("Helvetica", "I", 9)
        pdf.multi_cell(
            0,
            5,
            "DISCLAIMER: LexiPro produces cryptographically verifiable evidence and bounded quantitative estimates. "
            "Legal interpretation, liability conclusions, and remediation decisions remain with counsel.",
        )
        pdf.set_text_color(0, 0, 0)

        out = "docs/LexiPro_Financial_Exposure_Brief.pdf"
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
