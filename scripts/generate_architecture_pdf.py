from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors


def create_pdf():
    c = canvas.Canvas("LexiPro_Integration_Substrate_Overview.pdf", pagesize=letter)
    width, height = letter

    # --- HEADER ---
    c.setFont("Helvetica-Bold", 26)
    c.drawString(50, height - 60, "LexiPro Forensic OS")

    c.setFont("Helvetica", 12)
    c.setFillColor(colors.gray)
    c.drawString(50, height - 80, "Integration Architecture & Liability Containment")
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 10)
    c.drawString(
        50,
        height - 98,
        "This document describes a code-level enforcement substrate intended for integration into existing GenAI systems."
    )
    c.setFont("Helvetica", 10)
    c.drawString(
        50,
        height - 112,
        "Delivered as a modular server substrate + client citation-teleport component; designed to drop into existing RAG stacks."
    )

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.darkred)
    c.drawRightString(width - 50, height - 60, "STATUS: INTEGRATION-READY PROTOTYPE (DEMONSTRATED) (v1.3.0)")
    c.setFillColor(colors.black)

    c.setLineWidth(1)
    c.line(50, height - 110, width - 50, height - 110)

    # --- CONTENT ---
    start_y = height - 160

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, start_y, "1. Deterministic Grounding & Enforcement Engine")

    c.setFont("Helvetica", 11)
    text_1 = [
        "Unlike standard RAG, LexiPro enforces a deterministic verification loop at the API level.",
        "   • Vector Retrieval: High-fidelity embedding model (swappable).",
        "   • Verification pass: cross-checks generated claims against retrieved source spans prior to release.",
        "   • Enforcement Gate: If logic fails, the API throws 422 Unprocessable Entity.",
        "     We strictly prefer silence over hallucination."
    ]

    text_y = start_y - 20
    for line in text_1:
        c.drawString(50, text_y, line)
        text_y -= 15

    section_2_y = text_y - 25
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, section_2_y, "2. Cryptographic Deletion (\"Aggressive Amnesia\")")

    c.setFont("Helvetica", 11)
    text_2 = [
        "Eliminating long-tail liability via cryptographic deletion (AES-256-GCM).",
        "   • Data at Rest: All workspace data is encrypted with a unique ephemeral key.",
        "   • Deletion = Destruction: Deleting a case shreds the key.",
        "   • Result: Data becomes unrecoverable under the defined threat model."
    ]

    text_y = section_2_y - 20
    for line in text_2:
        c.drawString(50, text_y, line)
        text_y -= 15

    section_3_y = text_y - 25
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, section_3_y, "3. Immutable Chain of Custody")

    c.setFont("Helvetica", 11)
    text_3 = [
        "A hash-chained audit ledger for evidence integrity.",
        "   • Hashing: Every action is SHA-256 hashed and linked to the previous event.",
        "   • Tamper Detection: Database modifications break the chain instantly.",
        "   • Verification: Exportable ledgers allow offline verification by opposing counsel."
    ]

    text_y = section_3_y - 20
    for line in text_3:
        c.drawString(50, text_y, line)
        text_y -= 15

    # --- FOOTER ---
    c.setLineWidth(0.5)
    c.line(50, 110, width - 50, 110)

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.gray)
    c.drawString(
        50,
        95,
        "Includes: repeatable proof-run artifacts, audit-linked proof packets, and license/SBOM inventory."
    )
    c.setFillColor(colors.black)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 78, "Direct Contact:")
    c.setFont("Helvetica", 10)
    c.drawString(140, 78, "Cody McKenzie  |  Founder  |  Broken Arrow Entertainment")
    c.drawString(140, 63, "BAEntertainmentMI@gmail.com  |  (810) 895-2161")

    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(colors.gray)
    c.drawRightString(width - 50, 40, "Confidential - Technical Due Diligence Only")
    c.drawRightString(width - 50, 28, "IP status available upon request")

    c.save()
    print("PDF Generated: LexiPro_Integration_Substrate_Overview.pdf")


if __name__ == "__main__":
    create_pdf()
