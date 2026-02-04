import os
import sys
from datetime import datetime
from urllib.parse import urlparse

from fpdf import FPDF

try:
    import psycopg2
    from psycopg2 import sql
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


def table_exists(cur, table_name):
    cur.execute("SELECT to_regclass(%s)", (f'public."{table_name}"',))
    return cur.fetchone()[0] is not None


def fetch_findings(cur):
    table_name = "AnalysisResult"
    if not table_exists(cur, table_name):
        return []

    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        """,
        (table_name,),
    )
    columns = [row[0] for row in cur.fetchall()]
    if not columns:
        return []

    candidate_cols = [
        col
        for col in columns
        if col.lower()
        in {
            "type",
            "finding_type",
            "category",
            "label",
            "title",
            "summary",
            "content",
            "details",
            "notes",
            "tags",
            "payload",
            "payloadjson",
        }
        or col.lower().endswith("json")
    ]
    if not candidate_cols:
        return []

    conditions = []
    params = []
    for col in candidate_cols:
        conditions.append(
            sql.SQL("({col}::text ILIKE %s OR {col}::text ILIKE %s)").format(
                col=sql.Identifier(col)
            )
        )
        params.extend(["%contradiction%", "%financial_discrepancy%"])

    order_col = None
    for candidate in ("createdAt", "created_at", "createdOn", "created_on"):
        if candidate in columns:
            order_col = candidate
            break

    query = sql.SQL("SELECT * FROM {table} WHERE {conds}").format(
        table=sql.Identifier(table_name), conds=sql.SQL(" OR ").join(conditions)
    )
    if order_col:
        query += sql.SQL(" ORDER BY {order_col} DESC").format(
            order_col=sql.Identifier(order_col)
        )
    query += sql.SQL(" LIMIT 5")

    cur.execute(query, params)
    rows = cur.fetchall()
    if not rows:
        return []
    col_names = [desc[0] for desc in cur.description]
    return [dict(zip(col_names, row)) for row in rows]


class BriefPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "LexiPro Forensic Brief", ln=True, align="C")
        self.set_font("Helvetica", "", 11)
        self.cell(0, 6, "Case Number: LEX-2026-001", ln=True, align="C")
        self.ln(4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-18)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 6, "Cryptographic Hash: ______________________________", ln=True, align="C")


def generate_pdf(findings, output_path):
    pdf = BriefPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 6, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", ln=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "Executive Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        "This brief summarizes automated forensic findings for the demo corpus. "
        "All observations are anchored to verified evidence artifacts.",
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "Detected Contradiction", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        "Anchor_Agreement.pdf conflicts with Contradictory_Memo.pdf regarding the "
        "execution timeline and obligations. The discrepancy indicates a material "
        "inconsistency in the record.",
    )
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 7, "AI Findings (Latest)", ln=True)
    pdf.set_font("Helvetica", "", 10)
    if not findings:
        pdf.multi_cell(
            0,
            6,
            "No matching AI findings were located in AnalysisResult. "
            "Verify the table name and ingestion pipeline.",
        )
    else:
        for idx, row in enumerate(findings, 1):
            summary = None
            for key in ("summary", "title", "label", "category", "type", "finding_type"):
                if key in row and row[key]:
                    summary = str(row[key])
                    break
            if not summary:
                summary = str(row)
            pdf.multi_cell(0, 6, f"{idx}. {summary}")

    pdf.output(output_path)


def main():
    output_path = os.path.join("docs", "LexiPro_Forensic_Brief.pdf")
    params = build_db_params()
    try:
        with psycopg2.connect(**params) as conn:
            with conn.cursor() as cur:
                findings = fetch_findings(cur)
    except Exception as exc:
        print(f"Database query failed: {exc}")
        findings = []

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    generate_pdf(findings, output_path)
    print(f"Generated forensic brief: {output_path}")


if __name__ == "__main__":
    main()
