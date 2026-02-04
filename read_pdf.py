import sys
from PyPDF2 import PdfReader

pdf_path = sys.argv[1] if len(sys.argv) > 1 else "LexiPro_Executive_Overview.pdf"
reader = PdfReader(pdf_path)
for page in reader.pages:
    print(page.extract_text())
