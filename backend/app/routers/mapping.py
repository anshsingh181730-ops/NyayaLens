"""
Statutory Mapping API Router for NyayaLens.
Provides bidirectional lookup between IPC/CrPC/IEA and BNS/BNSS/BSA.
"""

from fastapi import APIRouter, Query
from app.models.schemas import MappingLookupResponse
from app.services.mapper import mapper_service

router = APIRouter(prefix="/map", tags=["mapping"])

@router.get("/convert", response_model=MappingLookupResponse)
def convert_statutory_section(
    code: str = Query(..., description="Historic or new code (e.g. IPC, CrPC, IEA, BNS, BNSS, BSA)"),
    section: str = Query(..., description="Section number (e.g. 420, 302, 318(4), 173)")
):
    """
    Executes bidirectional correspondence lookup between historic and new Indian criminal codes.
    Deterministic result with official Gazette verification notice.
    """
    return mapper_service.convert(code=code, section=section)
