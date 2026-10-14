"""
Law Ingestion Script for NyayaLens.
Reads official statutory JSON or TXT files from /data/laws/ (and optionally extracts
from official PDFs in /data/) and chunks them strictly by Article/Section before
loading them into the persistent ChromaDB vector store with rich metadata.
"""

import os
import sys
import json
import re
from pathlib import Path

# Add backend directory to path so app modules can be imported
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.retrieval import retrieval_service
import fitz

def ingest_from_json(json_path: Path):
    """Ingests structured law units from a standardized JSON file."""
    print(f"Reading JSON statute file: {json_path.name}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    doc_name = data.get("document_name", json_path.stem)
    units_raw = data.get("units", [])
    if not units_raw:
        print(f"No units found in {json_path.name}.")
        return 0

    to_insert = []
    for u in units_raw:
        u_num = str(u.get("number", "1"))
        u_type = str(u.get("unit_type", "section"))
        unit_id = f"{json_path.stem}_{u_type}_{u_num}"
        text_content = f"{u_type.capitalize()} {u_num}: {u.get('title', '')}\n\n{u.get('text', '')}"

        to_insert.append({
            "id": unit_id,
            "text": text_content,
            "doc_name": doc_name,
            "unit_type": u_type,
            "unit_number": u_num,
            "title": u.get("title", ""),
            "chapter": u.get("chapter"),
            "part": u.get("part"),
            "status": u.get("status", "In Force")
        })

    inserted = retrieval_service.add_legal_units(to_insert)
    print(f"Successfully indexed {inserted} units from {json_path.name} into ChromaDB.")
    return inserted

def ingest_from_pdf_statute(pdf_path: Path, doc_name: str, unit_type: str = "section"):
    """
    Extracts text from an official legislative gazette PDF and segments
    by Article / Section patterns before inserting into ChromaDB.
    """
    print(f"Extracting and indexing official PDF statute: {pdf_path.name} ({doc_name})...")
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text("text") + "\n\n"
    doc.close()

    # Regex for Article or Section headers
    if unit_type.lower() == "article":
        pattern = re.compile(r"\n\s*(?:Article|Art\.)\s+(\d+[A-Z]?)\.\s+([^\n]+)\n(.*?)(?=\n\s*(?:Article|Art\.)\s+\d+[A-Z]?\.|\Z)", re.DOTALL | re.IGNORECASE)
    else:
        pattern = re.compile(r"\n\s*(?:Section|Sec\.)\s+(\d+[A-Z]?)\.\s+([^\n]+)\n(.*?)(?=\n\s*(?:Section|Sec\.)\s+\d+[A-Z]?\.|\Z)", re.DOTALL | re.IGNORECASE)

    to_insert = []
    matches = list(pattern.finditer(full_text))

    for m in matches:
        num = m.group(1).strip()
        title = m.group(2).strip()
        body = m.group(3).strip()
        unit_id = f"{pdf_path.stem}_{unit_type}_{num}"
        content = f"{unit_type.capitalize()} {num}. {title}\n\n{body}"

        to_insert.append({
            "id": unit_id,
            "text": content,
            "doc_name": doc_name,
            "unit_type": unit_type,
            "unit_number": num,
            "title": title,
            "chapter": "",
            "part": "",
            "status": "In Force"
        })

    if to_insert:
        inserted = retrieval_service.add_legal_units(to_insert)
        print(f"Successfully indexed {inserted} units from PDF {pdf_path.name}.")
        return inserted
    else:
        print(f"Notice: Regex segmentation returned 0 structured units from {pdf_path.name}. Please supply JSON files in /data/laws/ for exact unit parsing.")
        return 0

def main():
    print("==================================================")
    print("NyayaLens Statutory Ingestion Pipeline")
    print("==================================================")

    laws_dir = settings.LAWS_DIR
    data_dir = settings.DATA_PATH
    total_indexed = 0

    # 1. Process JSON files in data/laws
    if laws_dir.exists():
        for f in laws_dir.glob("*.json"):
            if "sample_law_schema" not in f.name:
                total_indexed += ingest_from_json(f)

    # 2. Check for official PDFs in data/
    coi_pdf = data_dir / "Constitution_of_India.pdf"
    if coi_pdf.exists():
        total_indexed += ingest_from_pdf_statute(coi_pdf, "Constitution of India", unit_type="article")

    bns_pdf = data_dir / "bns_2023.pdf"
    if bns_pdf.exists():
        total_indexed += ingest_from_pdf_statute(bns_pdf, "Bharatiya Nyaya Sanhita, 2023", unit_type="section")

    bnss_pdf = data_dir / "bnss_2023.pdf"
    if bnss_pdf.exists():
        total_indexed += ingest_from_pdf_statute(bnss_pdf, "Bharatiya Nagarik Suraksha Sanhita, 2023", unit_type="section")

    print("==================================================")
    print(f"Total statutory units ingested into ChromaDB: {total_indexed}")
    print("Ingestion complete.")

if __name__ == "__main__":
    main()
