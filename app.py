"""JusticeAutomator Streamlit app (pro se draft support, not legal advice)."""

from pathlib import Path
from datetime import date

import streamlit as st
from jinja2 import Template
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

from council.engine import deliberate
from logic.court_rules import (
    DEFAULT_DEFENDANT,
    DEFAULT_DISCLAIMER,
    DEFAULT_PLAINTIFF,
    DEFAULT_VENUE_CAPTION,
)

BASE = Path(__file__).resolve().parent
TEMPLATE_PATH = BASE / "templates" / "complaint_master.jinja2"
OUTPUT_DIR = BASE / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def render_complaint_text(context: dict) -> str:
    template = Template(TEMPLATE_PATH.read_text(encoding="utf-8"))
    return template.render(**context)


def write_pdf(text: str, output_path: Path) -> Path:
    c = canvas.Canvas(str(output_path), pagesize=LETTER)
    y = 760
    for line in text.splitlines():
        c.drawString(50, y, line[:110])
        y -= 16
        if y < 60:
            c.showPage()
            y = 760
    c.save()
    return output_path


def app() -> None:
    st.title("JusticeAutomator")
    st.caption("Informational draft support only. Not legal advice.")

    plaintiff = st.text_input("Plaintiff", value=DEFAULT_PLAINTIFF)
    defendant = st.text_input("Defendant", value=DEFAULT_DEFENDANT)
    incident_date = st.date_input("Incident Date", value=date.today()).isoformat()
    damages = st.number_input("Damages Claimed", min_value=0.0, value=25000.0, step=1000.0)
    venue = st.text_input("Venue Caption", value=DEFAULT_VENUE_CAPTION)

    facts = {
        "plaintiff_name": plaintiff,
        "defendant_name": defendant,
        "incident_date": incident_date,
        "damages_claimed": f"{damages:,.2f}",
        "venue_caption": venue,
        "disclaimer": DEFAULT_DISCLAIMER,
    }

    council_ok = st.checkbox("I approve council recommendation", value=False)

    if st.button("Run Council"):
        result = deliberate({**facts, "damages_claimed": damages}, user_approved=council_ok)
        st.subheader("Council")
        st.write("Proposer:", result.proposer)
        st.write("Critic:", result.critic)
        st.write("Judge:", result.judge)
        st.write("User Approved:", result.approved)

    if st.button("Generate Complaint PDF"):
        result = deliberate({**facts, "damages_claimed": damages}, user_approved=council_ok)
        if not result.approved:
            st.error("User approval required before generation.")
            return
        text = render_complaint_text(facts)
        out = write_pdf(text, OUTPUT_DIR / "complaint_draft.pdf")
        st.success(f"Generated: {out}")
        st.download_button("Download PDF", data=out.read_bytes(), file_name=out.name, mime="application/pdf")


if __name__ == "__main__":
    app()
