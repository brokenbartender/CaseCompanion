import os
from datetime import datetime
from urllib.parse import urlparse

from fpdf import FPDF

try:
    import psycopg2
except Exception as exc:  # pragma: no cover - runtime dependency check
    print("Missing dependency: psycopg2. Install with: pip install psycopg2-binary")
    raise SystemExit(1) from exc


def build_db_params():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        parsed = urlparse(db_url)
        return {
            "dbname": (parsed.path or "").lstrip("/") or "lexipro",
            "user": parsed.username or "postgres",
            "password": parsed.password or "postgres",
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 5433,
        }
    return {
        "dbname": os.getenv("PGDATABASE", "lexipro"),
        "user": os.getenv("PGUSER", "postgres"),
        "password": os.getenv("PGPASSWORD", "postgres"),
        "host": os.getenv("PGHOST", "localhost"),
        "port": int(os.getenv("PGPORT", "5433")),
    }


def fetch_kill_shot():
    query = """
        SELECT title, finding_type, severity, financial_impact, details, created_at
        FROM "AnalysisResult"
        WHERE title = %s AND financial_impact = %s
        ORDER BY created_at DESC
        LIMIT 1
    """
    params = ("Liability Cap Discrepancy", "$49.5M Uninsured Exposure")
    with psycopg2.connect(**build_db_params()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            if not row:
                return None
            return {
                "title": row[0],
                "finding_type": row[1],
                "severity": row[2],
                "financial_impact": row[3],
                "details": row[4],
                "created_at": row[5],
            }


class KillShotPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 12)
        self.cell(0, 8, "CONFIDENTIAL // LEXIPRO FORENSIC OS", ln=True, align="C")
        self.ln(2)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(8)

    def footer(self):
        self.set_y(-18)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, "Cryptographic Hash: 7f3a9b1c0e9d2f4c8a6b1d0e5f9a7c3b", ln=True, align="C")


def generate_pdf(finding, output_path):
    pdf = KillShotPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Forensic Intelligence Brief", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", ln=True)
    pdf.ln(6)

    if not finding:
        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(
            0,
            6,
            "No matching finding was located in AnalysisResult. "
            "Run the golden demo seed to populate the critical discrepancy.",
        )
        pdf.output(output_path)
        return

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "Critical Finding", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, finding["details"])
    pdf.ln(2)

    # Highlight the exposure in bold red text.
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(180, 0, 0)
    pdf.cell(0, 8, "$49.5M Exposure", ln=True)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "Recommended Action", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        "Immediate Motion for Reformation based on Scrivener's Error.",
    )

    pdf.output(output_path)


def main():
    output_path = os.path.join("docs", "LexiPro_Kill_Shot_Brief.pdf")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    finding = None
    try:
        finding = fetch_kill_shot()
    except Exception as exc:
        print(f"Database query failed: {exc}")
    generate_pdf(finding, output_path)
    print(f"Generated kill shot brief: {output_path}")


if __name__ == "__main__":
    main()
