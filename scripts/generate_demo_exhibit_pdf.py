from fpdf import FPDF
from pathlib import Path
import textwrap

REPLACEMENTS = {
    '"': '"',
    '“': '"',
    '”': '"',
    '’': "'",
    '–': '-',
    '—': '-',
    '→': '->'
}

input_md = Path('docs/LexiPro_Demo_Exhibit.md')
output_pdf = Path('docs/LexiPro_Demo_Exhibit.pdf')
text = input_md.read_text(encoding='utf-8-sig')
for target, repl in REPLACEMENTS.items():
    text = text.replace(target, repl)
lines = text.splitlines()

pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()
pdf.set_font('Helvetica', '', 12)

def write_wrapped(text, indent=0):
    wrap = textwrap.wrap(text, width=100)
    for part in wrap:
        if not part:
            continue
        pdf.set_x(pdf.l_margin + indent)
        pdf.cell(0, 6, part, ln=True)

for line in lines:
    stripped = line.strip()
    if not stripped:
        pdf.ln(4)
        continue
    if stripped.startswith('# '):
        pdf.set_font('Helvetica', 'B', 16)
        pdf.multi_cell(0, 8, stripped[2:])
        pdf.set_font('Helvetica', '', 12)
        continue
    if stripped.startswith('## '):
        pdf.set_font('Helvetica', 'B', 14)
        pdf.multi_cell(0, 7, stripped[3:])
        pdf.set_font('Helvetica', '', 12)
        continue
    if stripped.startswith('- '):
        bullet_text = stripped[2:]
        first, *rest = textwrap.wrap(bullet_text, width=96)
        if first:
            pdf.set_x(pdf.l_margin + 4)
            pdf.cell(0, 6, f'- {first}', ln=True)
        for part in rest:
            if not part:
                continue
            pdf.set_x(pdf.l_margin + 8)
            pdf.cell(0, 6, part, ln=True)
        continue
    if len(stripped) > 2 and stripped[0].isdigit() and stripped[1:3] == '. ':
        pdf.set_font('Helvetica', 'B', 12)
        write_wrapped(stripped)
        pdf.set_font('Helvetica', '', 12)
        continue
    write_wrapped(stripped)

pdf.output(output_pdf)

