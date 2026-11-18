from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

out = Path("output/pdf/lead-measurement-goal-final-test-plan.pdf")
out.parent.mkdir(parents=True, exist_ok=True)

NAVY = HexColor("#17233f")
PURPLE = HexColor("#4b267d")
PURPLE_SOFT = HexColor("#f2edfb")
TEAL_SOFT = HexColor("#e7f7f3")
ORANGE_SOFT = HexColor("#fff4e8")
MUTED = HexColor("#66748b")
INK = HexColor("#24314b")
LINE = HexColor("#dce3ed")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=HexColor("#148f83"), spaceAfter=12))
styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=29, leading=33, textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", fontName="Helvetica", fontSize=13, leading=19, textColor=MUTED, spaceAfter=18))
styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=NAVY, spaceBefore=6, spaceAfter=9))
styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=PURPLE, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name="Bodyx", fontName="Helvetica", fontSize=9.3, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="SmallBold", fontName="Helvetica-Bold", fontSize=8, leading=11, textColor=NAVY, spaceAfter=3))
styles.add(ParagraphStyle(name="Cell", fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=INK))
styles.add(ParagraphStyle(name="CellBold", fontName="Helvetica-Bold", fontSize=7.8, leading=10.5, textColor=NAVY))
styles.add(ParagraphStyle(name="HeadCell", fontName="Helvetica-Bold", fontSize=7.7, leading=10, textColor=colors.white))

def p(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def bullets(items):
    return [p(f"- {item}", "Bodyx") for item in items]

def title(number, text):
    return [p(f"{number}. {text}", "H1x")]

def make_table(rows, widths, row_bgs=None):
    converted = []
    for row_index, row in enumerate(rows):
        converted.append([cell if hasattr(cell, "wrap") else p(str(cell), "HeadCell" if row_index == 0 else "Cell") for cell in row])
    table = Table(converted, colWidths=widths, repeatRows=1)
    commands = [("GRID", (0, 0), (-1, -1), 0.45, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("BACKGROUND", (0, 0), (-1, 0), PURPLE)]
    for row_index, background in (row_bgs or {}).items():
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), background))
    table.setStyle(TableStyle(commands))
    return table

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(0.65 * inch, 0.57 * inch, 7.85 * inch, 0.57 * inch)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(PURPLE)
    canvas.drawString(0.65 * inch, 0.36 * inch, "THE AI RANKERS  |  LEAD MEASUREMENT")
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(7.85 * inch, 0.36 * inch, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(str(out), pagesize=letter, rightMargin=0.65 * inch, leftMargin=0.65 * inch, topMargin=0.65 * inch, bottomMargin=0.78 * inch, title="Lead Measurement Goal and Final Test Plan", author="The AI Rankers")
story = [Spacer(1, 0.42 * inch), p("IMPLEMENTATION GOAL DOCUMENT", "CoverKicker"), p("Lead Measurement & Final Test Plan", "CoverTitle"), p("Client SEO Performance Dashboard", "CoverSub")]
story.append(make_table([[p("Purpose", "SmallBold"), p("Define how website leads enter the platform, how the SEO dashboard reports them, and how the team validates the feature before release.")], [p("Decision", "SmallBold"), p("Raw leads are system records. Admins manage status and operational fields; they do not rewrite the original submission. Total Leads Generated is calculated from verified records and may be corrected only through an audited override.")]], [1.1 * inch, 5.7 * inch], {0: PURPLE_SOFT, 1: PURPLE_SOFT}))
story += [Spacer(1, 0.24 * inch), p("Status: implementation-ready  |  Version: 1.0  |  Owner: The AI Rankers", "Smallx"), PageBreak()]

story += title("1", "Goal and success definition")
story.append(p("Build a reliable lead measurement path from the client's website into the SEO dashboard. The dashboard must show a trustworthy Total Leads Generated metric without allowing routine edits to corrupt the original lead record."))
story += bullets(["A website form, call-tracking system, or approved CRM source creates the lead record.", "The system stores source, timestamp, client, and attribution context.", "The dashboard calculates lead totals for the selected reporting period.", "Admins can classify, assign, correct, or exclude a lead with an audit trail.", "Clients see approved totals and reporting context, not internal notes or private contact data."])
story += [p("Success metric", "H2x"), p("For any selected client and reporting period, the displayed lead total matches verified lead records included by the configured counting rules. Any manual correction is explainable through an audit record."), p("Important boundary", "H2x"), p("Google Cloud Console access covers GA4, Search Console, and GBP reporting APIs. Website lead capture may require a separate form, call-tracking, CRM, or webhook provider connection.")]

story += title("2", "Scope")
story.append(make_table([["In scope", "Out of scope for the baseline"], ["Total Leads Generated metric", "Changing or deleting the original submitted lead payload"], ["Website form or approved provider ingestion", "Automatic revenue attribution without a verified source"], ["Lead source, period, client, and attribution context", "Assuming GA4 alone proves a lead or booked job"], ["Admin status, assignment, notes, and duplicate flag", "A full sales CRM replacement"], ["Client-safe totals and trend comparisons", "Exposing contact details in client dashboards"]], [3.35 * inch, 3.35 * inch], {1: HexColor("#f7f9fc"), 3: HexColor("#f7f9fc"), 5: HexColor("#f7f9fc")}))

story += title("3", "Functional requirements")
story.append(make_table([["ID", "Requirement", "Acceptance condition"], ["LEAD-01", "Ingest website leads", "A valid form submission creates one lead for the correct client and source."], ["LEAD-02", "Preserve raw record", "Original payload, created time, and source event ID are immutable to normal admins."], ["LEAD-03", "Admin operations", "Admin can set status, owner, follow-up date, notes, duplicate, and invalid flags."], ["LEAD-04", "Metric calculation", "Total Leads Generated counts eligible, non-duplicate records in the selected period."], ["LEAD-05", "Admin correction", "A metric override requires a reason, actor, timestamp, and before/after values."], ["LEAD-06", "Client presentation", "Client sees approved totals, comparison, source label, and reporting period only."], ["LEAD-07", "Manual and synced data", "UI labels manual, synchronized, and overridden values clearly."], ["LEAD-08", "Date filters", "7, 30, 90 days, current month, previous month, and custom dates recalculate totals."], ["LEAD-09", "Failure handling", "Provider failures show stale or unavailable state instead of silently showing false freshness."]], [0.65 * inch, 1.75 * inch, 4.3 * inch], {2: HexColor("#f7f9fc"), 4: HexColor("#f7f9fc"), 6: HexColor("#f7f9fc"), 8: HexColor("#f7f9fc")}))

story += title("4", "Recommended data flow")
story.append(make_table([["Step", "System behavior", "Owner"], ["1. Capture", "Website form, call provider, or CRM sends a signed event or approved API response.", "Provider"], ["2. Validate", "Verify tenant, client, event ID, timestamp, source, and required fields. Reject duplicates.", "Backend"], ["3. Store", "Keep the raw lead record private and append an audit event.", "Database"], ["4. Classify", "Admin updates status, owner, follow-up date, and internal notes.", "Admin"], ["5. Aggregate", "Reporting query counts eligible records for the selected client and period.", "Reporting"], ["6. Publish", "Client sees the approved count and comparison after the reporting result is published.", "Admin"]], [0.8 * inch, 4.65 * inch, 1.25 * inch], {2: HexColor("#f7f9fc"), 4: HexColor("#f7f9fc"), 6: HexColor("#f7f9fc")}))
story.append(Spacer(1, 8))
story.append(make_table([[p("Security note", "SmallBold"), p("Do not email passwords or API keys. Use OAuth, a scoped service account, project invitation, or provider-specific integration credentials. Keep raw lead contact data out of logs and client-facing reports.")]], [1.1 * inch, 5.7 * inch], {0: TEAL_SOFT}))

story.append(PageBreak())
story += title("5", "Admin and client behavior")
story += [p("Admin workspace", "H2x")]
story += bullets(["View lead records only for authorized client workspaces.", "Filter by client, date, source, status, owner, and validity.", "Update operational fields without rewriting the raw submission.", "Create a metric override only when a source correction is necessary.", "See sync health, last successful sync, failed events, and retry state.", "Publish or hide the client-facing lead metric independently from internal records."])
story += [p("Client workspace", "H2x")]
story += bullets(["View Total Leads Generated for the selected period.", "View the comparison period and percentage movement where valid.", "See the source label and freshness state.", "Never see private lead names, emails, phone numbers, internal notes, or assignments unless explicitly added in a later phase."])

story += title("6", "Security and data quality controls")
story.append(make_table([["Control", "Baseline rule"], ["Tenant isolation", "Every lead query and dashboard aggregation includes the authenticated client boundary."], ["Role permissions", "Only ADMIN and SUPER_ADMIN can change operational fields or publish metric overrides."], ["Immutable raw data", "Raw payload and source event ID cannot be edited through the normal admin UI."], ["Audit trail", "Record actor, action, timestamp, client, entity, previous value, new value, and reason."], ["PII minimization", "Mask contact data in logs and keep private lead details out of client reports."], ["Idempotency", "Provider event IDs and deduplication rules prevent double counting."], ["Retention", "Define retention and deletion rules for raw lead data before production launch."]], [1.45 * inch, 5.25 * inch], {2: HexColor("#f7f9fc"), 4: HexColor("#f7f9fc"), 6: HexColor("#f7f9fc")}))

story += title("7", "Final testing plan")
story.append(make_table([["Test ID", "Test", "Expected result"], ["T-01", "Submit a valid website lead", "One lead is created for the correct client and source."], ["T-02", "Replay the same provider event", "No duplicate lead or duplicate metric count is created."], ["T-03", "Submit invalid or incomplete data", "Request is rejected safely and the failure is logged without PII leakage."], ["T-04", "Change lead status as admin", "Operational fields update; raw submission remains unchanged."], ["T-05", "Attempt client access to another client", "Request is denied and no cross-client data is returned."], ["T-06", "Apply each date filter", "Lead count and comparison recalculate correctly."], ["T-07", "Create an admin metric override", "Reason, actor, before value, and after value appear in the audit log."], ["T-08", "Simulate provider outage", "Dashboard shows stale/unavailable state and does not silently show false freshness."], ["T-09", "Publish to client", "Client sees only the approved total and safe source context."], ["T-10", "Review mobile layout", "Filters, cards, tables, and empty states stack without clipping or horizontal overflow."]], [0.55 * inch, 2.4 * inch, 3.75 * inch], {2: HexColor("#f7f9fc"), 4: HexColor("#f7f9fc"), 6: HexColor("#f7f9fc"), 8: HexColor("#f7f9fc"), 10: HexColor("#f7f9fc")}))

story += title("8", "Release gates and open decisions")
story += bullets(["Choose the first lead source: website forms, call tracking, CRM, or a combined provider.", "Define what counts as a lead and which statuses count toward Total Leads Generated.", "Confirm whether calls count as leads and how missed, spam, and duplicate calls are handled.", "Define retention, deletion, consent, and export rules for contact data.", "Connect the provider using scoped OAuth or service credentials; never share passwords by email.", "Complete the final testing matrix before showing lead totals to clients."])
story.append(Spacer(1, 12))
story.append(make_table([[p("Final decision", "SmallBold"), p("The baseline dashboard should report lead totals, not become a full CRM. Individual lead editing is limited to operational classification and correction workflows with audit history.")]], [1.15 * inch, 5.65 * inch], {0: ORANGE_SOFT}))

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(out.resolve())
