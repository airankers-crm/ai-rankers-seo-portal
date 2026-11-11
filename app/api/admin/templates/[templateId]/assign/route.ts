import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  const { templateId } = await params;
  const body = await request.json().catch(() => null) as { clientId?: unknown; versionId?: unknown; service?: unknown } | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId : "";
  const versionId = typeof body?.versionId === "string" ? body.versionId : "";
  const service = typeof body?.service === "string" ? body.service : "";
  if (!clientId || !versionId || !["Website SEO", "GBP performance"].includes(service)) return NextResponse.json({ error: "Client, version, and service are required." }, { status: 400 });
  const version = await prisma.reportTemplateVersion.findFirst({ where: { id: versionId, templateId, status: "PUBLISHED" }, select: { id: true } });
  if (!version) return NextResponse.json({ error: "Only a published version can be assigned." }, { status: 409 });
  const assignment = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.reportTemplateAssignment.upsert({ where: { clientId_service: { clientId, service } }, update: { templateId, versionId }, create: { clientId, templateId, versionId, service } });
    await transaction.auditLog.create({ data: { clientId, actorId: access.user!.id, action: "REPORT_TEMPLATE_ASSIGNED", entityType: "ReportTemplateAssignment", entityId: saved.id, after: { templateId, versionId, service } } });
    return saved;
  });
  return NextResponse.json({ assignment }, { status: 201 });
}
