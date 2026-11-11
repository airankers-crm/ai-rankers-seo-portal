import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import { ClientReport } from "../../../../../components/client-report";
import { buildReportView } from "../../../../../lib/reports/build-report-view";
import { parseTemplateConfig } from "../../../../../lib/report-template-store";
import { templateDefinition } from "../../../../../lib/report-templates";
import { requireAdminAccess } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminTemplatePreviewPage({ params, searchParams }: { params: Promise<{ templateId: string }>; searchParams?: Promise<{ clientId?: string; versionId?: string }> }) {
  await requireAdminAccess();
  const { templateId } = await params;
  const query = await searchParams;
  const template = await prisma.reportTemplate.findUnique({ where: { id: templateId }, include: { versions: { orderBy: { version: "desc" } } } });
  if (!template) notFound();
  const client = await prisma.client.findFirst({ where: { id: query?.clientId, status: "ACTIVE" }, select: { id: true, businessName: true } }) ?? await prisma.client.findFirst({ where: { status: "ACTIVE" }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } });
  if (!client) notFound();
  const version = template.versions.find((item) => item.id === query?.versionId) ?? template.versions.find((item) => item.status === "PUBLISHED") ?? template.versions[0];
  const fallback = templateDefinition(template.key)?.config;
  if (!version || !fallback) notFound();
  const report = await buildReportView(client.id, undefined, parseTemplateConfig(version.config, fallback));
  if (!report) notFound();

  return (
    <>
      <div className="admin-template-preview-bar">
        <div><span className="eyebrow">Super Admin · Template preview</span><strong>{template.title} · v{version.version}</strong><small>Previewing the same full report presentation a client will receive for {client.businessName}.</small></div>
        <div className="admin-template-preview-actions"><Link className="button" href={`/admin/templates?templateId=${template.id}&versionId=${version.id}`}>Edit version</Link><Link className="button" href="/admin/templates">Back to templates</Link></div>
      </div>
      <ClientReport report={report} />
    </>
  );
}
