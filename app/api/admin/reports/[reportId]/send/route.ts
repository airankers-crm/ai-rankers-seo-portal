import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to send a report." }, { status: 401 });
  const { reportId } = await params;
  const existing = await prisma.report.findUnique({ where: { id: reportId }, include: { client: { select: { id: true, businessName: true, contactEmail: true } } } });
  if (!existing) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (!existing.storageKey) return NextResponse.json({ error: "This report has no PDF attached." }, { status: 400 });
  if (!["DRAFT", "IN_REVIEW", "PUBLISHED"].includes(existing.status)) return NextResponse.json({ error: "This report is not ready to send." }, { status: 400 });

  const updated = await prisma.$transaction(async (transaction) => {
    const report = await transaction.report.update({ where: { id: reportId }, data: { status: "PUBLISHED", deliveryStatus: "SENT", isVisible: true, sentAt: new Date() }, include: { client: { select: { id: true, businessName: true, contactEmail: true } } } });
    await transaction.auditLog.create({
      data: {
        clientId: report.clientId,
        actorId: access.user!.id,
        action: "REPORT_SENT_TO_CLIENT_PORTAL",
        entityType: "Report",
        entityId: report.id,
        before: { status: existing.status, isVisible: existing.isVisible },
        after: { status: report.status, deliveryStatus: report.deliveryStatus, isVisible: report.isVisible, sentAt: report.sentAt?.toISOString() ?? null, recipient: report.client.contactEmail },
      },
    });
    return report;
  });

  return NextResponse.json({ report: { id: updated.id, status: updated.status, deliveryStatus: updated.deliveryStatus, isVisible: updated.isVisible, sentAt: updated.sentAt?.toISOString() ?? null, client: updated.client } });
}
