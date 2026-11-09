import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePortalAccess();
  const clientId = access.user?.clientId ?? (await prisma.client.findUnique({ where: { slug: "tony-roofing" }, select: { id: true } }))?.id;

  if (!clientId) return NextResponse.json({ changedAt: null }, { headers: { "Cache-Control": "no-store" } });

  const rows = await prisma.$queryRaw<Array<{ changedAt: Date | null }>>(Prisma.sql`
    SELECT GREATEST(
      (SELECT "updatedAt" FROM "Client" WHERE "id" = ${clientId}),
      (SELECT MAX("updatedAt") FROM "Section" WHERE "clientId" = ${clientId}),
      (SELECT MAX("updatedAt") FROM "Metric" WHERE "clientId" = ${clientId}),
      (SELECT MAX(value."updatedAt") FROM "MetricValue" value INNER JOIN "Metric" metric ON metric."id" = value."metricId" WHERE metric."clientId" = ${clientId}),
      (SELECT MAX("updatedAt") FROM "Goal" WHERE "clientId" = ${clientId}),
      (SELECT MAX(annotation."updatedAt") FROM "GoalAnnotation" annotation INNER JOIN "Goal" goal ON goal."id" = annotation."goalId" WHERE goal."clientId" = ${clientId}),
      (SELECT MAX("updatedAt") FROM "Report" WHERE "clientId" = ${clientId}),
      (SELECT MAX("updatedAt") FROM "Activity" WHERE "clientId" = ${clientId}),
      (SELECT MAX("publishedAt") FROM "DashboardVersion" WHERE "clientId" = ${clientId})
    ) AS "changedAt"
  `);

  return NextResponse.json(
    { changedAt: rows[0]?.changedAt?.toISOString() ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
