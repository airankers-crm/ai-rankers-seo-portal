import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";
import { parseTemplateConfig } from "../../../../../../lib/report-template-store";
import { templateDefinition } from "../../../../../../lib/report-templates";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  const { templateId } = await params;
  const template = await prisma.reportTemplate.findUnique({ where: { id: templateId }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
  if (!template) return NextResponse.json({ error: "Report template not found." }, { status: 404 });
  const body = await request.json().catch(() => null) as { label?: unknown; config?: unknown } | null;
  const fallback = templateDefinition(template.key)?.config;
  if (!fallback) return NextResponse.json({ error: "This template does not have an editable structure." }, { status: 400 });
  const latest = template.versions[0];
  const config = parseTemplateConfig(body?.config && typeof body.config === "object" ? body.config as Prisma.JsonValue : latest?.config ?? fallback as unknown as Prisma.JsonValue, fallback);
  const version = (latest?.version ?? 0) + 1;
  const created = await prisma.$transaction(async (transaction) => {
    const draft = await transaction.reportTemplateVersion.create({ data: { templateId, version, label: text(body?.label) || `Draft v${version}`, status: "DRAFT", config: config as unknown as Prisma.InputJsonValue } });
    await transaction.auditLog.create({ data: { actorId: access.user!.id, action: "REPORT_TEMPLATE_VERSION_CREATED", entityType: "ReportTemplateVersion", entityId: draft.id, after: { templateId, version, label: draft.label } } });
    return draft;
  });
  return NextResponse.json({ version: { id: created.id, version: created.version, label: created.label, status: created.status, config: created.config } }, { status: 201 });
}
