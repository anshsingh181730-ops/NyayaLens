"""
Statutory Mapping Service (Deterministic Lookup).
Executes exact, deterministic mapping between old criminal codes (IPC, CrPC, IEA)
and new criminal codes (BNS, BNSS, BSA) using the official Gazette mapping file.
Never uses LLM speculation or guessing for statutory cross-references.
"""

import json
import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.models.schemas import MappingLookupResponse

logger = logging.getLogger(__name__)

class MapperService:
    def __init__(self):
        self.mapping_data = self._load_mappings()

    def _load_mappings(self) -> Dict[str, Any]:
        if settings.MAPPING_FILE.exists():
            try:
                with open(settings.MAPPING_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading mapping file: {e}")
        return {"mappings": []}

    def convert(self, code: str, section: str) -> MappingLookupResponse:
        """
        Bidirectional statutory lookup:
        - IPC/CrPC/IEA -> BNS/BNSS/BSA
        - BNS/BNSS/BSA -> IPC/CrPC/IEA
        """
        code_clean = code.strip().upper()
        sec_clean = section.strip().lower().replace("sec", "").replace("section", "").strip()

        mappings = self.mapping_data.get("mappings", [])

        # 1. Forward lookup (Old -> New)
        for entry in mappings:
            old_code = entry.get("old_code", "").upper()
            old_sec = entry.get("old_section", "").lower().strip()

            if (code_clean == old_code or (code_clean == "IPC" and "PENAL" in old_code)) and (sec_clean == old_sec or sec_clean == old_sec.split("(")[0]):
                return MappingLookupResponse(
                    found=True,
                    old_code=entry.get("old_code"),
                    old_section=entry.get("old_section"),
                    new_code=entry.get("new_code"),
                    new_section=entry.get("new_section"),
                    subject=entry.get("subject"),
                    note=entry.get("note", "Verify against official gazette table.")
                )

        # 2. Reverse lookup (New -> Old)
        for entry in mappings:
            new_code = entry.get("new_code", "").upper()
            new_sec = entry.get("new_section", "").lower().strip()

            if code_clean == new_code and (sec_clean == new_sec or sec_clean == new_sec.split("(")[0]):
                return MappingLookupResponse(
                    found=True,
                    old_code=entry.get("old_code"),
                    old_section=entry.get("old_section"),
                    new_code=entry.get("new_code"),
                    new_section=entry.get("new_section"),
                    subject=entry.get("subject"),
                    note=entry.get("note", "Verify against official gazette table.")
                )

        return MappingLookupResponse(
            found=False,
            note="Section not found in current verified gazette table. Please verify against official Gazette mapping."
        )

mapper_service = MapperService()
