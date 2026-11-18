import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user?.clientId) return NextResponse.json({ seen: false });
  const { reportId } = await params;
  const report = await prisma.report.findFirst({ where: { id: reportId, clientId: access.user.clientId, isVisible: true }, select: { id: true } });
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  await prisma.reportRead.upsert({
    where: { reportId_userId: { reportId: report.id, userId: access.user.id } },
    create: { reportId: report.id, userId: access.user.id },
    update: { seenAt: new Date() },
  });

  return NextResponse.json({ seen: true }, { headers: { "Cache-Control": "no-store" } });
}
