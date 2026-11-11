import { AdminReportTemplate } from "../../../components/admin-report-template";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  await requireAdminAccess();
  const client = await prisma.client.findFirst({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true } });
  return <AdminReportTemplate clientId={client?.id} clientName={client?.businessName} />;
}
