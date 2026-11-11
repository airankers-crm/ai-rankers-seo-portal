import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { prisma } from "@ai-rankers/db";
import { ensureReportTemplates } from "../../../../lib/report-template-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  await ensureReportTemplates();
  const [templates, client] = await Promise.all([
    prisma.reportTemplate.findMany({ where: { isActive: true }, orderBy: { category: "asc" }, include: { versions: { orderBy: { version: "desc" }, take: 20 }, assignments: { select: { clientId: true, service: true, versionId: true } } } }),
    prisma.client.findFirst({ where: { status: "ACTIVE" }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);
  return NextResponse.json({ client, templates });
}
