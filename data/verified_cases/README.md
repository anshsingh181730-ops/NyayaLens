# Verified Cases Directory

This directory stores the index and metadata for verified Indian case law.

## Schema
`index.json` stores verified judgments available in the local repository:
```json
{
  "case_name": "Authentic Case Title",
  "court": "Supreme Court of India / High Court of ...",
  "year": 2024,
  "citation_strings": [
    "Official reporter citation strings (e.g. (2024) 1 SCC 100, 2024 INSC 50)"
  ],
  "text_path": "Relative path to judgment PDF or TXT file"
}
```

## How NyayaLens Uses This Index
1. **Verification of Citations**: When a document is analyzed, any citation string found in the text is checked against `citation_strings` in `index.json`.
2. **Quote & Proposition Check**: If the matched case has an existing file at `text_path`, NyayaLens performs an exact substring search for any quoted text and an LLM-assisted proposition check to verify whether the citing document accurately represents the holding of the cited authority.
3. **No Hallucination Rule**: If a citation is not present in `index.json`, it is labeled `"Could not verify, please check manually"` rather than presumed fake or fabricated.
