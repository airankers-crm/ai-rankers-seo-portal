import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";
import { parseTemplateConfig } from "../../../../../../../lib/report-template-store";
import { templateDefinition } from "../../../../../../../lib/report-templates";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ templateId: string; versionId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  const { templateId, versionId } = await params;
  const version = await prisma.reportTemplateVersion.findFirst({ where: { id: versionId, templateId }, include: { template: true } });
  if (!version) return NextResponse.json({ error: "Template version not found." }, { status: 404 });
  if (version.status !== "DRAFT") return NextResponse.json({ error: "Only draft versions can be edited." }, { status: 409 });
  const body = await request.json().catch(() => null) as { label?: unknown; config?: unknown } | null;
  const fallback = templateDefinition(version.template.key)?.config;
  if (!fallback) return NextResponse.json({ error: "This template does not have an editable structure." }, { status: 400 });
  const config = parseTemplateConfig(body?.config as Prisma.JsonValue ?? version.config, fallback);
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : version.label;
  const saved = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.reportTemplateVersion.update({ where: { id: version.id }, data: { label, config: config as unknown as Prisma.InputJsonValue } });
    await transaction.auditLog.create({ data: { actorId: access.user!.id, action: "REPORT_TEMPLATE_VERSION_UPDATED", entityType: "ReportTemplateVersion", entityId: updated.id, before: { label: version.label, config: version.config }, after: { label: updated.label, config: updated.config } } });
    return updated;
  });
  return NextResponse.json({ version: { id: saved.id, version: saved.version, label: saved.label, status: saved.status, config: saved.config } });
}

export async function POST(_request: Request, { params }: { params: Promise<{ templateId: string; versionId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  const { templateId, versionId } = await params;
  const version = await prisma.reportTemplateVersion.findFirst({ where: { id: versionId, templateId } });
  if (!version) return NextResponse.json({ error: "Template version not found." }, { status: 404 });
  const published = await prisma.$transaction(async (transaction) => {
    await transaction.reportTemplateVersion.updateMany({ where: { templateId, status: "PUBLISHED", id: { not: versionId } }, data: { status: "ARCHIVED" } });
    const updated = await transaction.reportTemplateVersion.update({ where: { id: versionId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await transaction.auditLog.create({ data: { actorId: access.user!.id, action: "REPORT_TEMPLATE_VERSION_PUBLISHED", entityType: "ReportTemplateVersion", entityId: updated.id, after: { templateId, version: updated.version, label: updated.label } } });
    return updated;
  });
  return NextResponse.json({ version: { id: published.id, version: published.version, label: published.label, status: published.status, publishedAt: published.publishedAt } });
}
