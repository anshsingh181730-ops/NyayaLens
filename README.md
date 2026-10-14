# NyayaLens

> **"Summaries you can verify, not just trust."**

NyayaLens is an AI-assisted judicial case summarizer and verified legal intelligence platform designed for Indian courts, advocates, law clerks, students, and citizens. 

While existing legal intelligence tools summarize and answer questions using generic LLMs, NyayaLens differentiates through **paragraph-anchored faithfulness verification** and **court-side usefulness**.

---

## Core Differentiators

1. **Faithfulness-Checked Summary**:
   Every summary claim is attributed to specific paragraph markers (`[¶12]`, `[¶14]`). Clicking any tag scrolls to and highlights the source paragraph in the original document, opening a *"Why this status?"* popover explaining its verification rating (**Supported**, **Partly supported**, or **Not supported**).
2. **Statutory & Case Citation Audit**:
   Upload any petition, judicial order, counter affidavit, or draft filing to automatically audit all case citations (AIR, SCC, SCR, INSC) and statutory provisions against verified authorities, performing quote checks and proposition support checks.
3. **Operative Directions Extractor**:
   Isolates enforceable commands from the court's operative order into an action checklist detailing the command, responsible authority, and statutory or calendar deadline.
4. **AI Law Agent (Grounded Multilingual RAG)**:
   Explicit 3-step routing pipeline classifying user intent into statutory lookups, IPC-to-BNS conversions, document summaries, citation audits, or directions. Strictly grounded in the Constitution of India and Central Acts, with explanation modes (*"Explain simply"* vs *"Lawyer mode"*) in English, Hindi, and Marathi.
5. **IPC to BNS Converter**:
   Deterministic lookup engine matching historic criminal codes (IPC, CrPC, IEA) to 2023 enacted criminal codes (BNS, BNSS, BSA) based on official Gazette comparative tables without LLM guesswork.
6. **Privacy-First Anonymisation**:
   Redacts Indian PII (person names, phone numbers, Aadhaar, PAN) into synthetic tokens (*Party A*, *Party B*) prior to LLM processing and restores authentic names in memory before displaying results.

---

## Assumptions Made

1. **No Data Fabrication**: NyayaLens does not invent or synthesize statutory sections, articles, or case citations. All legal texts and comparative mappings are sourced from official files supplied in `/data` or official legislative repositories.
2. **Deterministic Gazette Mappings**: Cross-references between IPC/CrPC/IEA and BNS/BNSS/BSA are strictly governed by authentic comparative tables published in the Gazette of India; speculative mapping is explicitly forbidden.
3. **Ephemeral Processing by Default**: Judicial records are processed in volatile memory and deleted at the conclusion of the session unless the user explicitly toggles *"Save my documents"*.
4. **OCR Fallback**: Searchable digital PDFs are parsed directly using PyMuPDF; pages with character density below threshold automatically trigger Tesseract OCR with confidence scoring.

---

## Setup & Running Instructions

### 1. Backend Setup (Python 3.10+)

```bash
# 1. Navigate to backend directory and create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate   # On Linux/macOS: source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (copy example and insert ANTHROPIC_API_KEY)
copy ..\.env.example .env

# 4. Ingest verified laws into ChromaDB and start FastAPI server
python scripts/ingest_laws.py
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (Node.js 18+)

```bash
# 1. Navigate to frontend directory and install dependencies
cd frontend
npm install

# 2. Start the Vite development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## How to Load Law Data and Sample Judgments

- **Adding Official Laws (`/data/laws/`)**:
  Place official Acts or constitutional provisions in `/data/laws/` as JSON files following `data/laws/sample_law_schema.json`. Run `python backend/scripts/ingest_laws.py` to chunk by Article/Section and index into the ChromaDB vector store.
- **Adding Sample Judgments (`/sample_judgements/` or `/data/sample_judgments/`)**:
  Drop any authentic Supreme Court or High Court judgment PDF into `/sample_judgements/` or upload it directly through the Workspace interface. Landmark rulings currently available include *Arnesh Kumar (2014)*, *D.K. Basu (1997)*, *Kesavananda Bharati (1973)*, *Lalita Kumari (2014)*, and *Maneka Gandhi (1978)*.
- **Updating Comparative Mappings (`/data/mapping/`)**:
  Add verified Gazette correspondence mappings into `/data/mapping/ipc_bns_mapping.json`.

---

## Honest Limitations & Judicial Disclaimer

> **CRITICAL LEGAL NOTICE**: NyayaLens is an assistive technology prototype built for judicial workflow acceleration and research. It does not provide legal advice, representation, or authoritative judicial determinations. Large language models can err, misinterpret nuances, or omit critical procedural exceptions. All summaries, citation audits, and statutory cross-references must be reviewed and verified by a qualified advocate or judicial officer before being relied upon in any court of law.
