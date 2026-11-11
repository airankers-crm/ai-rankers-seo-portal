import { AdminReportTemplate } from "../../../components/admin-report-template";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../lib/auth/access";
import { ensureReportTemplates } from "../../../lib/report-template-store";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage({ searchParams }: { searchParams?: Promise<{ templateId?: string; versionId?: string }> }) {
  await requireAdminAccess();
  await ensureReportTemplates();
  const [client, templates, query] = await Promise.all([
    prisma.client.findFirst({ where: { status: "ACTIVE" }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
    prisma.reportTemplate.findMany({ where: { isActive: true }, orderBy: { category: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 20 }, assignments: { select: { clientId: true, service: true, versionId: true } } } }),
    searchParams,
  ]);
  return <AdminReportTemplate clientId={client?.id} clientName={client?.businessName} initialTemplateKey={query?.templateId} initialVersionId={query?.versionId} initialTemplates={templates.map((template) => ({ id: template.id, key: template.key as "website-seo" | "gbp", category: template.category as "Website SEO" | "GBP performance", title: template.title, description: template.description, versions: template.versions.map((version) => ({ id: version.id, version: version.version, label: version.label, status: version.status, config: version.config })), assignments: template.assignments }))} />;
}
