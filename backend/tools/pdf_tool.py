import os
from datetime import datetime
from typing import Any
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY


def generate_report(
    run_id: str,
    ticker: str,
    company_data: dict[str, Any],
    financial_data: dict[str, Any],
    news_data: dict[str, Any],
    risk_data: dict[str, Any],
    recommendation: dict[str, Any],
    output_dir: str = "reports",
) -> str:
    """Generate a professional PDF equity research report using ReportLab."""
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{output_dir}/{run_id}_{ticker}_research_report.pdf"

    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()
    story = []

    # --- Custom styles ---
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#1a365d"),
        spaceAfter=4,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#4a5568"),
        spaceAfter=2,
        alignment=TA_CENTER,
    )
    section_header_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading1"],
        fontSize=13,
        textColor=colors.HexColor("#1a365d"),
        spaceBefore=14,
        spaceAfter=6,
        borderPad=2,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        leftIndent=14,
        spaceAfter=2,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#718096"),
        leading=11,
        alignment=TA_JUSTIFY,
    )

    company_name = company_data.get("company_name", ticker)
    rec = recommendation.get("recommendation", "HOLD")
    rec_color = {"BUY": colors.HexColor("#276749"), "SELL": colors.HexColor("#9b2335"), "HOLD": colors.HexColor("#744210")}.get(rec, colors.black)

    # --- Header ---
    story.append(Paragraph("AI Equity Research Report", title_style))
    story.append(Paragraph(f"{company_name} &nbsp;&bull;&nbsp; {ticker}", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M UTC')}", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a365d")))
    story.append(Spacer(1, 10))

    # --- Recommendation banner ---
    rec_data = [
        [
            Paragraph(f"Recommendation: <b>{rec}</b>", ParagraphStyle("rec", fontSize=16, textColor=rec_color, alignment=TA_CENTER)),
            Paragraph(f"Confidence: <b>{recommendation.get('confidence', 0)}%</b>", ParagraphStyle("conf", fontSize=14, textColor=colors.HexColor("#2d3748"), alignment=TA_CENTER)),
            Paragraph(f"Risk Level: <b>{risk_data.get('risk_level', 'N/A').upper()}</b>", ParagraphStyle("risk", fontSize=14, textColor=colors.HexColor("#2d3748"), alignment=TA_CENTER)),
        ]
    ]
    rec_table = Table(rec_data, colWidths=["33%", "33%", "34%"])
    rec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(rec_table)
    story.append(Spacer(1, 6))

    if recommendation.get("reasoning"):
        story.append(Paragraph(f"<i>{recommendation['reasoning']}</i>", body_style))

    # --- Company Overview ---
    story.append(Paragraph("Company Overview", section_header_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))

    overview_data = [
        ["Sector", company_data.get("sector", "N/A"), "Industry", company_data.get("industry", "N/A")],
        ["Market Cap", f"${company_data.get('market_cap', 0):,.0f}", "Employees", f"{company_data.get('employees', 0):,}"],
        ["Country", company_data.get("country", "N/A"), "Currency", company_data.get("currency", "USD")],
    ]
    overview_table = Table(overview_data, colWidths=["20%", "30%", "20%", "30%"])
    overview_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#edf2f7")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#edf2f7")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(overview_table)

    if company_data.get("business_summary"):
        story.append(Spacer(1, 6))
        summary = company_data["business_summary"][:800] + ("..." if len(company_data["business_summary"]) > 800 else "")
        story.append(Paragraph(summary, body_style))

    # --- Financial Analysis ---
    story.append(Paragraph("Financial Analysis", section_header_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))

    fin_score = financial_data.get("financial_score", 0)
    score_color = colors.HexColor("#276749") if fin_score >= 70 else (colors.HexColor("#744210") if fin_score >= 40 else colors.HexColor("#9b2335"))
    story.append(Paragraph(
        f"Financial Score: <font color='#{score_color.hexval()[2:]}' size='14'><b>{fin_score}/100</b></font>",
        ParagraphStyle("score", fontSize=11, spaceAfter=6),
    ))

    if financial_data.get("strengths"):
        story.append(Paragraph("<b>Strengths:</b>", body_style))
        for s in financial_data["strengths"]:
            story.append(Paragraph(f"&#x2713; &nbsp;{s}", bullet_style))

    if financial_data.get("weaknesses"):
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Areas of Concern:</b>", body_style))
        for w in financial_data["weaknesses"]:
            story.append(Paragraph(f"&#x26A0; &nbsp;{w}", bullet_style))

    # --- News & Sentiment ---
    story.append(Paragraph("News & Market Sentiment", section_header_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))

    sentiment = news_data.get("sentiment", "neutral").upper()
    sentiment_color = {"POSITIVE": "#276749", "NEGATIVE": "#9b2335", "NEUTRAL": "#744210"}.get(sentiment, "#2d3748")
    story.append(Paragraph(
        f"Overall Sentiment: <font color='{sentiment_color}'><b>{sentiment}</b></font> "
        f"(Score: {news_data.get('sentiment_score', 0)}/100)",
        body_style,
    ))

    if news_data.get("key_news"):
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Key News Headlines:</b>", body_style))
        for headline in news_data["key_news"][:5]:
            story.append(Paragraph(f"&#x2022; &nbsp;{headline}", bullet_style))

    # --- Risk Analysis ---
    story.append(Paragraph("Risk Assessment", section_header_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        f"Risk Level: <b>{risk_data.get('risk_level', 'N/A').upper()}</b> "
        f"| Risk Score: <b>{risk_data.get('risk_score', 0)}/100</b>",
        body_style,
    ))

    if risk_data.get("risks"):
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Key Risk Factors:</b>", body_style))
        for risk in risk_data["risks"]:
            story.append(Paragraph(f"&#x25CF; &nbsp;{risk}", bullet_style))

    # --- Disclaimer ---
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>IMPORTANT DISCLAIMER:</b> This report is generated by an AI system for educational and informational "
        "purposes only. It does not constitute financial advice, investment recommendations, or a solicitation to "
        "buy or sell any securities. Past performance is not indicative of future results. All investment decisions "
        "should be made in consultation with a qualified financial advisor. The AI system does not guarantee the "
        "accuracy, completeness, or timeliness of any information contained herein.",
        disclaimer_style,
    ))

    doc.build(story)
    return filename
