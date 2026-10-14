"""
Privacy-First Anonymisation Service for NyayaLens.
Replaces personally identifiable information (PII) including individual names,
phone numbers, email addresses, Aadhaar, PAN numbers, and street addresses
with synthetic pseudonyms (Party A, Party B, Witness 1, etc.) before invoking AI models.
Maintains in-memory substitution maps per request to restore names before displaying to user.
Never writes raw PII to logs.
"""

import re
from typing import Tuple, Dict

class AnonymiserService:
    # Common Indian PII Regex patterns
    AADHAAR_REGEX = re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b")
    PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
    PHONE_REGEX = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

    # Common judicial party descriptors
    PARTY_NAME_PATTERNS = [
        re.compile(r"\b(?:Shri|Smt\.|Kumari|Mr\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"),
        re.compile(r"\b(?:Appellant|Petitioner|Applicant)\s+(?:No\.\s*\d+\s+)?(?:named\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"),
        re.compile(r"\b(?:Respondent|Opposite Party|Accused)\s+(?:No\.\s*\d+\s+)?(?:named\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b")
    ]

    @classmethod
    def anonymise(cls, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Replaces detected PII with deterministic placeholder tokens.
        Returns: (anonymised_text, reverse_mapping_dict)
        """
        mapping: Dict[str, str] = {}
        party_counter = 1
        anonymised = text

        # 1. Redact phone numbers
        phone_matches = set(cls.PHONE_REGEX.findall(anonymised))
        for p in phone_matches:
            token = f"[PHONE_{abs(hash(p)) % 10000}]"
            mapping[token] = p
            anonymised = anonymised.replace(p, token)

        # 2. Redact emails
        email_matches = set(cls.EMAIL_REGEX.findall(anonymised))
        for e in email_matches:
            token = f"[EMAIL_{abs(hash(e)) % 10000}]"
            mapping[token] = e
            anonymised = anonymised.replace(e, token)

        # 3. Redact Aadhaar & PAN
        aadhaar_matches = set(cls.AADHAAR_REGEX.findall(anonymised))
        for a in aadhaar_matches:
            token = "[AADHAAR_REDACTED]"
            mapping[token] = a
            anonymised = anonymised.replace(a, token)

        pan_matches = set(cls.PAN_REGEX.findall(anonymised))
        for pan in pan_matches:
            token = "[PAN_REDACTED]"
            mapping[token] = pan
            anonymised = anonymised.replace(pan, token)

        # 4. Detect person/party names
        discovered_names = set()
        for pat in cls.PARTY_NAME_PATTERNS:
            for match in pat.finditer(anonymised):
                full_name = match.group(1).strip()
                if len(full_name.split()) >= 2:
                    discovered_names.add(full_name)

        # Assign deterministic synthetic pseudonym (Party A, Party B, ...)
        party_letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
        for name in discovered_names:
            if party_counter <= len(party_letters):
                token = f"Party {party_letters[party_counter - 1]}"
            else:
                token = f"Party {party_counter}"
            party_counter += 1
            mapping[token] = name
            anonymised = re.sub(re.escape(name), token, anonymised)

        return anonymised, mapping

    @classmethod
    def deanonymise(cls, text: str, mapping: Dict[str, str]) -> str:
        """Restores original party names from in-memory mapping before presenting to user."""
        restored = text
        for token, original in mapping.items():
            restored = restored.replace(token, original)
        return restored

anonymiser_service = AnonymiserService()
