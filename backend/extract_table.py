import urllib.request
import pdfplumber
import json
import traceback

url = 'https://www.fstg-marrakech.ac.ma/Emploi-temps/Emploi-temps-GB-GEG-S2plus.pdf'
pdf_path = 'sample_timetable.pdf'

try:
    urllib.request.urlretrieve(url, pdf_path)
    
    result = {"pages": []}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_data = {
                "text": page.extract_text(),
                "tables": []
            }
            tables = page.extract_tables()
            for table in tables:
                clean_table = []
                for row in table:
                    clean_row = [str(cell).replace('\n', ' ') if cell else '' for cell in row]
                    clean_table.append(clean_row)
                page_data["tables"].append(clean_table)
            result["pages"].append(page_data)
            
    with open('extraction_result.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

except Exception as e:
    with open('extraction_result.json', 'w', encoding='utf-8') as f:
        json.dump({"error": str(e), "traceback": traceback.format_exc()}, f)
