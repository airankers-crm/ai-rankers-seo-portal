import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../lib/auth/access";
import { AdminReportOperations } from "../../../components/admin-report-operations";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdminAccess();
  const [clients, reportRows] = await Promise.all([
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true, contactEmail: true } }),
    prisma.report.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { client: { select: { id: true, businessName: true, contactEmail: true } } } }),
  ]);

  return <AdminReportOperations
    clients={clients}
    reports={reportRows.map((report) => ({
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
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      sentAt: report.sentAt?.toISOString() ?? null,
      hasFile: Boolean(report.storageKey),
    }))}
  />;
}
