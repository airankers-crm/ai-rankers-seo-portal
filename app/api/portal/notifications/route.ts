import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePortalAccess();
  if (access.preview || !access.user?.clientId) return NextResponse.json({ reports: 0 }, { headers: { "Cache-Control": "no-store" } });

  const reports = await prisma.report.count({
    where: {
      clientId: access.user.clientId,
      isVisible: true,
      deliveryStatus: "SENT",
      sentAt: { not: null },
      reads: { none: { userId: access.user.id } },
    },
  });

  return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
}
