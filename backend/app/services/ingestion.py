"""
Document Ingestion Service.
Handles PDF reading, OCR fallback on scanned pages, paragraph segmentation,
preservation of authentic paragraph markers, and chunk grouping (~1000-1500 words).
"""

import re
import fitz  # PyMuPDF
from typing import List, Dict, Any, Tuple
from app.config import settings
from app.services.ocr import ocr_service
from app.models.schemas import DocumentParagraph

class IngestionService:
    @staticmethod
    def extract_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[List[Dict[str, Any]], bool, bool]:
        """
        Parses PDF bytes page-by-page.
        Returns:
            pages_data: List of dicts with {page_number, text, ocr_used, low_quality}
            overall_ocr_used: bool
            overall_low_quality: bool
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages_data = []
        overall_ocr_used = False
        overall_low_quality = False

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            text = page.get_text("text").strip()
            page_ocr_used = False
            page_low_quality = False

            # Check character density; if virtually empty, trigger OCR fallback
            if len(text) < settings.OCR_DENSITY_THRESHOLD_CHARS:
                try:
                    pix = page.get_pixmap(dpi=200)
                    ocr_text, conf, low_qual = ocr_service.ocr_pixmap(pix)
                    if len(ocr_text) > len(text):
                        text = ocr_text
                        page_ocr_used = True
                        page_low_quality = low_qual
                        overall_ocr_used = True
                        if low_qual:
                            overall_low_quality = True
                except Exception:
                    pass

            pages_data.append({
                "page_number": page_num,
                "text": text,
                "ocr_used": page_ocr_used,
                "low_quality": page_low_quality
            })

        doc.close()
        return pages_data, overall_ocr_used, overall_low_quality

    @staticmethod
    def extract_from_raw_text(text: str) -> Tuple[List[Dict[str, Any]], bool, bool]:
        """Handles pasted plain text as a single page or pseudo-pages."""
        pages_data = [{
            "page_number": 1,
            "text": text.strip(),
            "ocr_used": False,
            "low_quality": False
        }]
        return pages_data, False, False

    @classmethod
    def extract_from_image_bytes(cls, image_bytes: bytes, mime_type: str = "image/jpeg") -> Tuple[List[Dict[str, Any]], bool, bool]:
        """
        Parses document image bytes (JPG, PNG, WebP) using Gemini Vision OCR with local fallback.
        """
        from app.services.llm import llm_service
        from PIL import Image
        import io

        text = ""
        # 1. Try Gemini Multimodal Vision OCR first
        try:
            text = llm_service.extract_text_from_image(image_bytes, mime_type)
        except Exception:
            text = ""

        # 2. Local OCR Fallback if vision returned empty or short
        if not text or len(text.strip()) < 30:
            try:
                img = Image.open(io.BytesIO(image_bytes))
                ocr_text, conf, low_qual = ocr_service.ocr_page_image(img)
                if len(ocr_text.strip()) > len(text.strip()):
                    text = ocr_text.strip()
            except Exception:
                pass

        # 3. PyMuPDF conversion fallback
        if not text or len(text.strip()) < 20:
            try:
                img_doc = fitz.open(stream=image_bytes, filetype="jpg")
                pdf_bytes = img_doc.convert_to_pdf()
                return cls.extract_from_pdf_bytes(pdf_bytes)
            except Exception:
                pass

        if not text.strip():
            text = "Notice: The uploaded photo could not be legibly transcribed. Please ensure the document photo is well-lit and clearly focused."

        pages_data = [{
            "page_number": 1,
            "text": text.strip(),
            "ocr_used": True,
            "low_quality": False
        }]
        return pages_data, True, False

    @classmethod
    def extract_from_docx_bytes(cls, docx_bytes: bytes) -> Tuple[List[Dict[str, Any]], bool, bool]:
        """
        Parses Microsoft Word (.docx) documents paragraph-by-paragraph.
        """
        import io
        import docx

        try:
            doc = docx.Document(io.BytesIO(docx_bytes))
            paragraphs = []
            for p in doc.paragraphs:
                p_text = p.text.strip()
                if p_text:
                    paragraphs.append(p_text)

            full_text = "\n\n".join(paragraphs)
            if not full_text.strip():
                full_text = "Notice: The uploaded Word document contains no readable text."

            pages_data = [{
                "page_number": 1,
                "text": full_text,
                "ocr_used": False,
                "low_quality": False
            }]
            return pages_data, False, False
        except Exception as e:
            # Fallback using zipfile and xml parsing if python-docx encountered an issue
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                with zipfile.ZipFile(io.BytesIO(docx_bytes)) as docx_zip:
                    xml_content = docx_zip.read("word/document.xml")
                    tree = ET.fromstring(xml_content)
                    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                    raw_paras = []
                    for p in tree.iterfind('.//w:p', namespaces):
                        texts = [node.text for node in p.iterfind('.//w:t', namespaces) if node.text]
                        if texts:
                            raw_paras.append(''.join(texts))
                    text_res = "\n\n".join(raw_paras)
                    return [{
                        "page_number": 1,
                        "text": text_res or "Empty document",
                        "ocr_used": False,
                        "low_quality": False
                    }], False, False
            except Exception:
                return [{
                    "page_number": 1,
                    "text": f"Error extracting DOCX content: {str(e)}",
                    "ocr_used": False,
                    "low_quality": True
                }], False, True

    @classmethod
    def segment_into_paragraphs(cls, pages_data: List[Dict[str, Any]]) -> List[DocumentParagraph]:
        """
        Segments text into paragraphs across pages while preserving official judicial numbering.
        Recognizes patterns such as:
          - "1.", "2.", "15."
          - "[1]", "[14]"
          - "(1)", "(a)"
          - "¶12"
        If no explicit numbering exists, sequential IDs (¶1, ¶2, ...) are assigned.
        """
        paragraphs: List[DocumentParagraph] = []
        sequential_counter = 1

        # Regex for leading paragraph numbers in Indian judgments
        num_pattern = re.compile(r"^(?:(?:\[(\d+)\])|(?:\((\d+)\))|(?:(\d+)\.)|(?:¶\s*(\d+)))\s+(.*)$", re.DOTALL)

        for page in pages_data:
            page_num = page["page_number"]
            page_text = page["text"]

            # Split by double newline or block separators
            raw_blocks = re.split(r"\n\s*\n+", page_text)

            for block in raw_blocks:
                block_clean = " ".join(block.split()).strip()
                if not block_clean or len(block_clean) < 15:
                    continue  # Skip trivial headers or whitespace

                match = num_pattern.match(block_clean)
                if match:
                    # Found explicit numbering
                    extracted_num = match.group(1) or match.group(2) or match.group(3) or match.group(4)
                    para_id = f"¶{extracted_num}"
                    content = match.group(5).strip()
                else:
                    para_id = f"¶{sequential_counter}"
                    content = block_clean
                    sequential_counter += 1

                # Basic heuristic classification for early functional tag
                fn_class = cls._classify_paragraph_preliminary(content)

                paragraphs.append(DocumentParagraph(
                    para_id=para_id,
                    page_number=page_num,
                    text=content,
                    functional_class=fn_class
                ))

        return paragraphs

    @staticmethod
    def _classify_paragraph_preliminary(text: str) -> str:
        lower = text.lower()
        if any(w in lower for w in ["ordered accordingly", "appeal is allowed", "petition is dismissed", "directions are issued", "stand disposed of", "operative part"]):
            return "order"
        elif any(w in lower for w in ["we have considered", "in our considered view", "the question before us", "we hold that", "the ratio"]):
            return "reasoning"
        elif any(w in lower for w in ["learned counsel for the petitioner", "submitted that", "contended that", "appellant contended"]):
            return "arguments"
        elif any(w in lower for w in ["brief facts", "the case of the prosecution", "the FIR was registered", "the respondent filed"]):
            return "facts"
        elif any(w in lower for w in ["the issues arise", "question of law", "whether the court"]):
            return "issues"
        return "general"

    @staticmethod
    def group_chunks(paragraphs: List[DocumentParagraph], target_words: int = 1200) -> List[Dict[str, Any]]:
        """
        Groups paragraphs into ~1000-1500 word groups, never splitting a paragraph.
        Records the para_id range and page range for each chunk.
        """
        chunks = []
        current_chunk_paras: List[DocumentParagraph] = []
        current_word_count = 0

        for p in paragraphs:
            p_words = len(p.text.split())
            if current_word_count + p_words > target_words and current_chunk_paras:
                # Close current chunk
                chunks.append({
                    "start_para_id": current_chunk_paras[0].para_id,
                    "end_para_id": current_chunk_paras[-1].para_id,
                    "start_page": current_chunk_paras[0].page_number,
                    "end_page": current_chunk_paras[-1].page_number,
                    "paragraphs": current_chunk_paras,
                    "text": "\n\n".join([f"[{cp.para_id}] {cp.text}" for cp in current_chunk_paras]),
                    "word_count": current_word_count
                })
                current_chunk_paras = [p]
                current_word_count = p_words
            else:
                current_chunk_paras.append(p)
                current_word_count += p_words

        if current_chunk_paras:
            chunks.append({
                "start_para_id": current_chunk_paras[0].para_id,
                "end_para_id": current_chunk_paras[-1].para_id,
                "start_page": current_chunk_paras[0].page_number,
                "end_page": current_chunk_paras[-1].page_number,
                "paragraphs": current_chunk_paras,
                "text": "\n\n".join([f"[{cp.para_id}] {cp.text}" for cp in current_chunk_paras]),
                "word_count": current_word_count
            })

        return chunks

ingestion_service = IngestionService()
