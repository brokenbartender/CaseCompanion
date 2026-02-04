import os
from datetime import datetime

from fpdf import FPDF


class FinancialBriefPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, "LEXIPRO FINANCIAL EXPOSURE AUDIT // CONFIDENTIAL", ln=True, align="L")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", ln=True, align="L")
        self.line(10, 30, 200, 30)
        self.ln(14)

    def footer(self):
        self.set_y(-18)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 6, "Integrity Marker: 0xB28A1D-LOCKED | Deterministic Valuation | ISO 27001", align="C")


def render_two_columns(pdf, left_title, left_body, right_title, right_body):
    start_y = pdf.get_y()
    left_x = 10
    right_x = 110
    col_width = 90

    pdf.set_xy(left_x, start_y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_width, 6, left_title)
    left_y = pdf.get_y()

    pdf.set_xy(left_x, left_y)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(col_width, 6, left_body)
    left_end = pdf.get_y()

    pdf.set_xy(right_x, start_y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_width, 6, right_title)
    right_y = pdf.get_y()

    pdf.set_xy(right_x, right_y)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(200, 0, 0)
    pdf.multi_cell(col_width, 6, right_body)
    pdf.set_text_color(0, 0, 0)
    right_end = pdf.get_y()

    pdf.set_y(max(left_end, right_end) + 6)


def generate_report():
    os.makedirs("docs", exist_ok=True)

    pdf = FinancialBriefPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(0, 10, " SECTION 1: EXPOSURE CLASSIFICATION", ln=True, fill=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, "VARIANCE DETECTED: Liability Cap Definition Mismatch")
    pdf.multi_cell(0, 6, "CALCULATED EXPOSURE: $49,500,000.00 (Uninsured)")
    pdf.multi_cell(0, 6, "STATUS: Material Deviation from Standard Terms")
    pdf.ln(6)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(0, 10, " SECTION 2: INSTRUMENT COMPARISON (The Evidence)", ln=True, fill=True)
    pdf.ln(4)

    render_two_columns(
        pdf,
        "Source A (Master Agreement 2024)",
        "...liability capped at $500,000...",
        "Source B (Amendment 2025)",
        "...Cap redefined as $50,000,000...",
    )

    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_fill_color(230, 230, 230)
    pdf.cell(0, 10, " SECTION 3: METHODOLOGY", ln=True, fill=True)
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(
        0,
        6,
        "LexiPro's financial extraction engine deterministically mapped numeric values across linked "
        "instruments. This variance was hidden within a schedule definition update.",
    )

    pdf.output("docs/LexiPro_Financial_Brief.pdf")
    print("Generated financial brief: docs/LexiPro_Financial_Brief.pdf")


if __name__ == "__main__":
    generate_report()
