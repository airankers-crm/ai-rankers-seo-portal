import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { ReportStorageError, storeReportPdf } from "../../../../lib/report-storage";

export const dynamic = "force-dynamic";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to upload a report." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "The upload form could not be read." }, { status: 400 });

  const clientId = text(form.get("clientId"));
  const title = text(form.get("title"));
  const type = text(form.get("type")) || "Monthly SEO report";
  const periodLabel = text(form.get("periodLabel"));
  const intent = text(form.get("intent"));
  const file = form.get("file");

  if (!clientId || !title || !periodLabel || !(file instanceof File)) return NextResponse.json({ error: "Client, report title, reporting period, and PDF are required." }, { status: 400 });
  if (title.length > 120 || periodLabel.length > 60) return NextResponse.json({ error: "Report title or reporting period is too long." }, { status: 400 });
  if (intent !== "DRAFT" && intent !== "IN_REVIEW") return NextResponse.json({ error: "Choose Save draft or Review & send." }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { id: clientId, status: { not: "ARCHIVED" } }, select: { id: true, businessName: true, contactEmail: true } });
  if (!client) return NextResponse.json({ error: "Select an active client before uploading." }, { status: 404 });

  const reportId = `report_${crypto.randomUUID()}`;
  try {
    const stored = await storeReportPdf(file, reportId);
    const report = await prisma.$transaction(async (transaction) => {
      const created = await transaction.report.create({
        data: {
          id: reportId,
          clientId,
          title,
          type,
          periodLabel,
          storageKey: stored.storageKey,
          originalFileName: file.name,
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          status: intent,
          deliveryStatus: "NOT_SENT",
          isVisible: false,
        },
        include: { client: { select: { id: true, businessName: true, contactEmail: true } } },
      });
      await transaction.auditLog.create({
        data: {
          clientId,
          actorId: access.user!.id,
          action: intent === "DRAFT" ? "REPORT_DRAFT_CREATED" : "REPORT_SUBMITTED_FOR_REVIEW",
          entityType: "Report",
          entityId: created.id,
          after: { title, type, periodLabel, status: intent, originalFileName: file.name, sizeBytes: file.size },
        },
      });
      return created;
    });

    return NextResponse.json({ report: serializeReport(report) }, { status: 201 });
  } catch (error) {
    if (error instanceof ReportStorageError) {
      const status = error.code === "NOT_CONFIGURED" ? 503 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "The report could not be saved. Try again." }, { status: 500 });
  }
}

function serializeReport(report: { id: string; clientId: string; title: string; type: string; periodLabel: string; status: string; deliveryStatus: string; isVisible: boolean; originalFileName: string | null; sizeBytes: number | null; storageKey: string | null; createdAt: Date; updatedAt: Date; sentAt: Date | null; client: { id: string; businessName: string; contactEmail: string | null } }) {
  return {
    id: report.id,
    clientId: report.clientId,
    clientName: report.client.businessName,
    recipientEmail: report.client.contactEmail,
    title: report.title,
    type: report.type,
    periodLabel: report.periodLabel,
    status: report.status,
    deliveryStatus: report.deliveryStatus,
    isVisible: report.isVisible,
    originalFileName: report.originalFileName,
    sizeBytes: report.sizeBytes,
    hasFile: Boolean(report.storageKey),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
    sentAt: report.sentAt?.toISOString() ?? null,
    client: report.client,
  };
}
