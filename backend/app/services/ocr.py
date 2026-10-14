"""
OCR Fallback service using pytesseract and pdf2image.
Extracts text from scanned or non-searchable PDF pages and provides confidence metrics.
"""

import io
import logging
from typing import Tuple
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        self._rapid_ocr = None
        try:
            from rapidocr_onnxruntime import RapidOCR
            self._rapid_ocr = RapidOCR()
            logger.info("RapidOCR initialized successfully for local neural OCR.")
        except Exception as e:
            logger.warning(f"RapidOCR initialization failed: {e}")

        if settings.OCR_TESSERACT_CMD:
            try:
                import pytesseract
                pytesseract.pytesseract.tesseract_cmd = settings.OCR_TESSERACT_CMD
            except Exception:
                pass

    def ocr_page_image(self, image: Image.Image) -> Tuple[str, float, bool]:
        """
        Runs OCR on a PIL Image using RapidOCR with pytesseract fallback.
        Returns: (extracted_text, average_confidence, is_low_quality)
        """
        # 1. Try RapidOCR (local neural OCR)
        if self._rapid_ocr:
            try:
                buf = io.BytesIO()
                image.save(buf, format="PNG")
                result, _ = self._rapid_ocr(buf.getvalue())
                if result:
                    lines = [item[1] for item in result if item[1]]
                    confs = [float(item[2]) for item in result if len(item) > 2 and item[2]]
                    avg_conf = (sum(confs) / len(confs)) * 100 if confs else 85.0
                    text = "\n".join(lines).strip()
                    if text:
                        return text, avg_conf, avg_conf < 50.0
            except Exception as e:
                logger.warning(f"RapidOCR execution failed: {e}")

        # 2. Try pytesseract fallback
        try:
            import pytesseract
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confidences = [
                float(c) for c in data.get("conf", [])
                if isinstance(c, (int, float, str)) and str(c).replace(".", "", 1).isdigit() and float(c) > 0
            ]
            extracted_text = pytesseract.image_to_string(image)
            avg_conf = sum(confidences) / len(confidences) if confidences else 50.0
            is_low_quality = avg_conf < 60.0
            return extracted_text.strip(), avg_conf, is_low_quality
        except Exception as e:
            logger.warning(f"pytesseract fallback unavailable: {e}")

        return "", 0.0, True

    def ocr_pixmap(self, fitz_pixmap) -> Tuple[str, float, bool]:
        """Convert PyMuPDF pixmap into PIL Image and run OCR."""
        try:
            img_bytes = fitz_pixmap.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            return self.ocr_page_image(image)
        except Exception as e:
            logger.error(f"Error converting pixmap to image: {e}")
            return "", 0.0, True

ocr_service = OCRService()
