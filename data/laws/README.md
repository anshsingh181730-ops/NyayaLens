# NyayaLens - Verified Law Texts Directory

This directory is designated for official statutory texts, acts, and constitutional provisions.

> **CRITICAL LEGAL NOTICE**: In compliance with strict judicial fidelity constraints, NyayaLens does not invent or fabricate statutory provisions or case law. All statutory data ingested into the vector database for RAG retrieval must come from verified official sources.

## How to Obtain Official Texts
1. **India Code (Official Repository of Central Acts)**:
   - URL: https://www.indiacode.nic.in
   - Download official Gazette notifications and acts in plain text or structured PDF format.
2. **Legislative Department, Ministry of Law and Justice, Government of India**:
   - URL: https://legislative.gov.in
   - Source the official texts of the Constitution of India, Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA).

## File Formats Supported
You can provide statutes in either **JSON** or **TXT** format. Place them in this folder (`/data/laws/`).

### JSON Format (`<act_name>.json`)
Each JSON file should represent an Act or Constitution with structured units:
```json
{
  "document_name": "Constitution of India",
  "short_code": "COI",
  "source_url": "https://legislative.gov.in/constitution-of-india",
  "units": [
    {
      "unit_type": "article",
      "number": "21",
      "title": "Protection of life and personal liberty",
      "part": "Part III: Fundamental Rights",
      "chapter": null,
      "text": "No person shall be deprived of his life or personal liberty except according to procedure established by law.",
      "status": "In Force"
    }
  ]
}
```

### Ingestion
Run the ingestion script to chunk by Article/Section and load into the persistent ChromaDB vector store:
```bash
python backend/scripts/ingest_laws.py
```
