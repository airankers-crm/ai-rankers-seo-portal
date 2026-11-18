from pathlib import Path
import html
import re
import unicodedata

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "SECURITY_BASELINE.md"
OUTPUT = ROOT / "output" / "pdf" / "AI-Rankers-Web-Application-Security-Standard.pdf"

PURPLE = colors.HexColor("#24124D")
PURPLE_LIGHT = colors.HexColor("#5A36A8")
TEAL = colors.HexColor("#08A88A")
INK = colors.HexColor("#17213A")
MUTED = colors.HexColor("#60708D")
LINE = colors.HexColor("#DCE3EE")
PALE = colors.HexColor("#F5F7FB")


def normalize(value: str) -> str:
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2192": "->",
        "\u00b7": "-",
        "\u2265": ">=",
        "\u2264": "<=",
    }
    for old, new in replacements.items():
        value = value.replace(old, new)
    return unicodedata.normalize("NFKC", value)


def inline(value: str) -> str:
    value = html.escape(normalize(value), quote=False)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", value)
    return value


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=29,
    leading=34, textColor=colors.white, alignment=TA_LEFT, spaceAfter=12,
))
styles.add(ParagraphStyle(
    name="DocSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11.5,
    leading=17, textColor=colors.HexColor("#E5E9F5"), alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="CoverMeta", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5,
    leading=15, textColor=colors.HexColor("#D6DDF0"), alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="H1Doc", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19,
    leading=24, textColor=PURPLE, spaceBefore=12, spaceAfter=10, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="H2Doc", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13.5,
    leading=18, textColor=PURPLE_LIGHT, spaceBefore=13, spaceAfter=6, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="BodyDoc", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3,
    leading=14, textColor=INK, spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="ControlBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.1,
    leading=13.5, textColor=INK, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="BulletDoc", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.9,
    leading=13, leftIndent=14, firstLineIndent=-8, textColor=INK, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="ContentsDoc", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5,
    leading=19, textColor=INK, leftIndent=8,
))
styles.add(ParagraphStyle(
    name="CodeDoc", parent=styles["Code"], fontName="Courier", fontSize=8.2,
    leading=12, textColor=INK, backColor=PALE, borderColor=LINE, borderWidth=0.5,
    borderPadding=8,
))
styles.add(ParagraphStyle(
    name="TableCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.7,
    leading=10.5, textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.8,
    leading=10, textColor=colors.white,
))


def page_footer(canvas, doc):
    page = canvas.getPageNumber()
    width, height = A4
    if page == 1:
        canvas.setFillColor(PURPLE)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(TEAL)
        canvas.rect(22 * mm, height - 31 * mm, 18 * mm, 2.5 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#D6DDF0"))
        canvas.setFont("Helvetica", 8)
        canvas.drawString(22 * mm, 17 * mm, "Reusable engineering security baseline")
        canvas.drawRightString(width - 22 * mm, 17 * mm, "Version 2.0")
        return

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, height - 14 * mm, width - 18 * mm, height - 14 * mm)
    canvas.setFillColor(PURPLE)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.drawString(18 * mm, height - 10.5 * mm, "WEB APPLICATION SECURITY STANDARD")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(18 * mm, 11 * mm, "Security baseline - review before release")
    canvas.drawRightString(width - 18 * mm, 11 * mm, f"Page {page - 1}")


def flush_table(story, rows):
    if not rows:
        return
    parsed = []
    for row in rows:
        cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
        if cells and all(set(cell) <= {"-", ":", " "} for cell in cells):
            continue
        parsed.append(cells)
    if not parsed:
        return
    columns = max(len(row) for row in parsed)
    for row in parsed:
        row.extend([""] * (columns - len(row)))
    data = []
    for row_index, row in enumerate(parsed):
        style = styles["TableHead"] if row_index == 0 else styles["TableCell"]
        data.append([Paragraph(inline(cell), style) for cell in row])
    table = Table(data, colWidths=[None] * columns, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    story.append(Spacer(1, 6))


def build_story():
    raw_lines = SOURCE.read_text(encoding="utf-8").splitlines()
    title = next((line[2:].strip() for line in raw_lines if line.startswith("# ")), "Web Application Security Standard")
    story = []

    # Cover content is placed inside the first page's purple background.
    story.extend([
        Spacer(1, 38 * mm),
        Paragraph(inline(title), styles["DocTitle"]),
        Paragraph("Reusable baseline, implementation guide, and production review checklist", styles["DocSubtitle"]),
        Spacer(1, 16 * mm),
        Paragraph("DOCUMENT CONTROL", styles["CoverMeta"]),
        Spacer(1, 3 * mm),
        Paragraph("Version 2.0<br/>Applies to web apps, portals, dashboards, CRMs, APIs, and SaaS products<br/>Review before every major release and at least quarterly", styles["CoverMeta"]),
        Spacer(1, 22 * mm),
        Paragraph("MFA/passkeys are intentionally documented as a future optional phase, not a baseline requirement.", styles["CoverMeta"]),
        PageBreak(),
        Paragraph("Contents", styles["H1Doc"]),
        Paragraph("A practical security standard for engineering, product, and operations teams.", styles["BodyDoc"]),
        Spacer(1, 4 * mm),
    ])

    contents = [
        "1. Purpose", "2. Security objectives", "3. Risk rating model", "4. Threat model and system flow",
        "5. Control catalog (SEC-01 through SEC-20)", "6. Required security test matrix", "7. Production release checklist",
        "8. Security review record template", "9. Security exception process", "10. Reuse instructions",
    ]
    for item in contents:
        story.append(Paragraph(f"- {inline(item)}", styles["ContentsDoc"]))
    story.extend([Spacer(1, 10 * mm), Paragraph("How to use this document", styles["H2Doc"]), Paragraph("Copy this standard into each application repository, replace generic terms with project-specific names, and attach evidence links for code, configuration, infrastructure, tests, and deployment verification. Every control must have an explicit status and owner.", styles["BodyDoc"]), PageBreak()])

    in_code = False
    code_lines = []
    table_rows = []
    skip_title = True
    for line in raw_lines:
        if skip_title and line.startswith("# "):
            skip_title = False
            continue
        if line.startswith("```"):
            if in_code:
                story.append(Preformatted(normalize("\n".join(code_lines)), styles["CodeDoc"]))
                story.append(Spacer(1, 6))
                code_lines = []
                in_code = False
            else:
                if table_rows:
                    flush_table(story, table_rows)
                    table_rows = []
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue
        if line.startswith("|"):
            table_rows.append(line)
            continue
        if table_rows:
            flush_table(story, table_rows)
            table_rows = []
        if not line.strip():
            continue
        if line.startswith("## "):
            story.append(Paragraph(inline(line[3:].strip()), styles["H1Doc"]))
            continue
        if line.startswith("### "):
            story.append(KeepTogether([Paragraph(inline(line[4:].strip()), styles["H2Doc"])]))
            continue
        if line.startswith("- ") or re.match(r"^\d+\.\s", line):
            item = re.sub(r"^(-|\d+\.)\s+", "", line)
            story.append(Paragraph(inline(item), styles["BulletDoc"], bulletText="-"))
            continue
        story.append(Paragraph(inline(line), styles["ControlBody"]))
    if table_rows:
        flush_table(story, table_rows)
    return story


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
    topMargin=21 * mm, bottomMargin=18 * mm, title="Web Application Security Standard",
    author="AI Rankers Engineering",
)
doc.build(build_story(), onFirstPage=page_footer, onLaterPages=page_footer)
print(OUTPUT)
