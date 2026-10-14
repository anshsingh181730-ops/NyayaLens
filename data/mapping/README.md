# Statutory Mapping Documentation

This directory houses the mapping tables between India's historic criminal codes and the new criminal laws enacted in 2023:

- **IPC (Indian Penal Code, 1860)** $\rightarrow$ **BNS (Bharatiya Nyaya Sanhita, 2023)**
- **CrPC (Code of Criminal Procedure, 1973)** $\rightarrow$ **BNSS (Bharatiya Nagarik Suraksha Sanhita, 2023)**
- **IEA (Indian Evidence Act, 1872)** $\rightarrow$ **BSA (Bharatiya Sakshya Adhiniyam, 2023)**

## Source of Truth
The primary source of truth is the official comparative tables published by the Ministry of Home Affairs / Ministry of Law and Justice, Government of India. The authentic gazette PDF is stored at `data/IPC_BNS_Mapping.pdf`.

## Schema
Entries in `ipc_bns_mapping.json` strictly adhere to:
```json
{
  "old_code": "IPC",
  "old_section": "420",
  "new_code": "BNS",
  "new_section": "318(4)",
  "subject": "Cheating and dishonestly inducing delivery of property",
  "note": "Official comparative gazette table entry"
}
```
The application strictly enforces deterministic lookup without LLM hallucination or speculative section guessing.
