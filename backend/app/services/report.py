"""
PDF Report Generation Service using ReportLab.
Generates official Verification Reports and Citation Audit Reports
with strict statutory disclaimers, statistical breakdowns, and reviewer signature blocks.
"""

import io
from datetime import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

class ReportService:
    DISCLAIMER_TEXT = "AI-assisted judicial summary. Verify before use. Not legal advice."

    @classmethod
    def generate_verification_report_pdf(
        cls,
        document_filename: str,
        summary_data: Dict[str, Any],
        citations_data: Dict[str, Any],
        directions_data: Dict[str, Any],
        privacy_mode: bool = False
    ) -> bytes:
        """Generates downloadable Verification Report PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0B1F3A") # Navy 900
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#5B6577")
        )
        section_heading = ParagraphStyle(
            "SecHead",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0B1F3A"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1B2433")
        )
        tag_style = ParagraphStyle(
            "Tag",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1F7A5C")
        )

        story = []

        # 1. Header & Title
        story.append(Paragraph("NYAYALENS | JUDICIAL VERIFICATION REPORT", title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"Document: <b>{document_filename}</b> | Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
        story.append(Paragraph(f"Privacy Mode Applied: <b>{'Enabled (PII Anonymised)' if privacy_mode else 'Standard Mode'}</b>", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#C9A227"), spaceAfter=12))

        # 2. Executive Summary Metrics Table
        stats = summary_data.get("stats", {})
        total_s = stats.get("total_sentences", 0)
        sup = stats.get("supported_count", 0)
        part = stats.get("partly_supported_count", 0)
        not_sup = stats.get("not_supported_count", 0)
        score = stats.get("faithfulness_score", 100.0)

        metrics_data = [
            ["Metric", "Value", "Judicial Standard"],
            ["Total Evaluated Claims", str(total_s), "100% evaluated with cited paragraphs"],
            ["Fully Supported Claims", str(sup), f"{(sup/max(total_s, 1)*100):.1f}% verifiable match"],
            ["Partly Supported Claims", str(part), "Requires cross-checking against record"],
            ["Not Supported / Unverified", str(not_sup), "Flagged for legal counsel review"],
            ["Faithfulness Index", f"{score}%", "Weighted judicial accuracy score"]
        ]

        t_metrics = Table(metrics_data, colWidths=[180, 120, 230])
        t_metrics.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E4DED0")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F5EE")]),
        ]))
        story.append(t_metrics)
        story.append(Spacer(1, 12))

        # 3. Summary Statements Breakdown
        story.append(Paragraph("Evaluated Summary Claims & Verification Status", section_heading))
        claims_rows = [["Section / Claim", "Cited Paragraphs", "Verification Status"]]

        for sec in summary_data.get("sections", [])[:5]:
            for s in sec.get("sentences", [])[:4]:
                claim_text = f"<b>[{sec.get('title')}]</b>: {s.get('sentence')}"
                p_tags = ", ".join(s.get("para_ids", [])) or "None"
                status_str = s.get("support_status", "Not supported")
                claims_rows.append([
                    Paragraph(claim_text[:200] + "...", body_style),
                    Paragraph(p_tags, tag_style),
                    Paragraph(f"<b>{status_str}</b>", body_style)
                ])

        t_claims = Table(claims_rows, colWidths=[330, 90, 110])
        t_claims.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#14305A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E4DED0")),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_claims)
        story.append(Spacer(1, 12))

        # 4. Operative Directions Summary
        dirs_list = directions_data.get("directions", [])
        if dirs_list:
            story.append(Paragraph("Operative Directions (Court Action Items)", section_heading))
            dir_rows = [["Direction", "Responsible Party", "Deadline"]]
            for d in dirs_list[:5]:
                dir_rows.append([
                    Paragraph(d.get("direction", "")[:180], body_style),
                    Paragraph(d.get("responsible_party", "Authorities"), body_style),
                    Paragraph(d.get("deadline") or "As per rules", body_style)
                ])
            t_dirs = Table(dir_rows, colWidths=[310, 120, 100])
            t_dirs.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E4DED0")),
            ]))
            story.append(t_dirs)
            story.append(Spacer(1, 14))

        # 5. Reviewer Verification Box
        story.append(Paragraph("Judicial Review & Attestation", section_heading))
        sign_box_data = [
            [
                Paragraph("<b>Reviewed by Advocate / Law Clerk:</b> ___________________________", body_style),
                Paragraph("<b>Enrollment / ID:</b> ____________________", body_style)
            ],
            [
                Paragraph("<b>Date of Verification:</b> ___________________________", body_style),
                Paragraph("<b>Signature:</b> ____________________", body_style)
            ]
        ]
        t_sign = Table(sign_box_data, colWidths=[320, 210])
        t_sign.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#C9A227")),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F5EE")),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(t_sign)

        # 6. Statutory Disclaimer Footer
        story.append(Spacer(1, 16))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#5B6577"), spaceAfter=6))
        disclaimer_p = Paragraph(f"<b>CRITICAL NOTICE</b>: {cls.DISCLAIMER_TEXT}", subtitle_style)
        story.append(disclaimer_p)

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    @classmethod
    def generate_audit_report_pdf(cls, document_filename: str, audit_data: Dict[str, Any]) -> bytes:
        """Generates downloadable One-Page Citation Audit Report PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0B1F3A")
        )
        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#5B6577")
        )
        section_heading = ParagraphStyle(
            "SecHead",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0B1F3A"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1B2433")
        )

        story = []

        # 1. Header
        story.append(Paragraph("NYAYALENS | STATUTORY & CITATION AUDIT REPORT", title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"Audited Document: <b>{document_filename}</b> | Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#C9A227"), spaceAfter=10))

        # 2. Audit Totals Table
        tot = audit_data.get("total_citations", 0)
        ver = audit_data.get("verified_count", 0)
        doc_only = audit_data.get("doc_only_count", 0)
        unv = audit_data.get("could_not_verify_count", 0)

        summary_table_data = [
            ["Status Classification", "Count", "Recommended Advocate Action"],
            ["Verified Against Official Repository", str(ver), "Established legal authority in record"],
            ["Found in Uploaded Document Only", str(doc_only), "Referenced in text, external gazette check optional"],
            ["Could Not Verify (Manual Check Required)", str(unv), "Mandatory manual verification in law library required"]
        ]
        t_summary = Table(summary_table_data, colWidths=[200, 70, 260])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0B1F3A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E4DED0")),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_summary)
        story.append(Spacer(1, 12))

        # 3. Citation Items Table
        story.append(Paragraph("Audited Authorities Detail", section_heading))
        cit_rows = [["Citation / Authority", "Type", "Status", "Source Paragraphs"]]
        for c in audit_data.get("citations", [])[:18]:
            p_ids = ", ".join(c.get("para_ids", [])) or "-"
            cit_rows.append([
                Paragraph(f"<b>{c.get('raw_text')}</b>", body_style),
                Paragraph(c.get("citation_type", "case"), body_style),
                Paragraph(f"<b>{c.get('status')}</b>", body_style),
                Paragraph(p_ids, body_style)
            ])

        t_cits = Table(cit_rows, colWidths=[270, 60, 130, 70])
        t_cits.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#14305A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E4DED0")),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_cits)

        # 4. Sign-off & Disclaimer
        story.append(Spacer(1, 14))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#5B6577"), spaceAfter=6))
        story.append(Paragraph(f"<b>CRITICAL NOTICE</b>: {cls.DISCLAIMER_TEXT}", subtitle_style))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

report_service = ReportService()
