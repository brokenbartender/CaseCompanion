import pdfplumber
from pathlib import Path

def extract(pdf_path, txt_path):
    with pdfplumber.open(pdf_path) as pdf:
        parts=[]
        for page in pdf.pages:
            text = page.extract_text() or ""
            parts.append(text)
    Path(txt_path).write_text("\n".join(parts), encoding='utf-8')

extract('references/evidence_benchbook.pdf','references/evidence_benchbook.txt')
extract('references/crime_victim_rights_benchbook.pdf','references/crime_victim_rights_benchbook.txt')
print('done')
