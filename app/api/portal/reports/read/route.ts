import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST() {
  const access = await requirePortalAccess();
  if (access.preview || !access.user?.clientId) return NextResponse.json({ seen: false });

  const reports = await prisma.report.findMany({
    where: { clientId: access.user.clientId, isVisible: true, deliveryStatus: "SENT", sentAt: { not: null } },
    select: { id: true },
  });
  if (reports.length > 0) {
    await prisma.reportRead.createMany({
      data: reports.map((report) => ({ reportId: report.id, userId: access.user!.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ seen: true }, { headers: { "Cache-Control": "no-store" } });
}
