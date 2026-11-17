import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type ConfigBody = {
  clientId?: unknown;
  ga4PropertyId?: unknown;
  gscSiteUrl?: unknown;
  gbpAccountId?: unknown;
  gbpLocationId?: unknown;
};

function optionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

export async function PATCH(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });

  const body = await request.json().catch(() => null) as ConfigBody | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId) return NextResponse.json({ error: "clientId is required." }, { status: 400 });

  const values = {
    ga4PropertyId: optionalText(body?.ga4PropertyId, 160),
    gscSiteUrl: optionalText(body?.gscSiteUrl, 500),
    gbpAccountId: optionalText(body?.gbpAccountId, 200),
    gbpLocationId: optionalText(body?.gbpLocationId, 200),
  };
  if (Object.values(values).some((value) => value === undefined)) return NextResponse.json({ error: "Google resource identifiers are invalid." }, { status: 400 });

  const existing = await prisma.googleIntegration.findUnique({ where: { clientId }, select: { id: true, status: true } });
  if (!existing) return NextResponse.json({ error: "Connect Google before saving resource selections." }, { status: 409 });

  const saved = await prisma.$transaction(async (transaction) => {
    const integration = await transaction.googleIntegration.update({ where: { id: existing.id }, data: values });
    await transaction.auditLog.create({ data: { clientId, actorId: access.user!.id, action: "GOOGLE_INTEGRATION_CONFIGURED", entityType: "GoogleIntegration", entityId: integration.id, after: values } });
    return integration;
  });

  return NextResponse.json({ integration: { clientId: saved.clientId, status: saved.status, ga4PropertyId: saved.ga4PropertyId, gscSiteUrl: saved.gscSiteUrl, gbpAccountId: saved.gbpAccountId, gbpLocationId: saved.gbpLocationId } });
}
