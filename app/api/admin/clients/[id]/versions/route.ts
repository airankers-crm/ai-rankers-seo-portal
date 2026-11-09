import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type VersionClient = {
  id: string;
  businessName: string;
  brandMark: string | null;
  brandAccent: string;
  websiteUrl: string | null;
  sections: Array<{ id: string; name: string; kind: string; position: number; isVisible: boolean; isDraft: boolean }>;
  metrics: Array<{ id: string; key: string; name: string; description: string | null; sectionId: string; displayType: string; valueFormat: string; source: string; higherIsBetter: boolean; position: number; isVisible: boolean; isDraft: boolean; values: Array<{ id: string; periodStart: Date; periodEnd: Date; value: Prisma.Decimal; source: string; note: string | null; isOverride: boolean }> }>;
};

function snapshotFor(client: VersionClient) {
  return {
    client: { id: client.id, businessName: client.businessName, brandMark: client.brandMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl },
    sections: client.sections.map((section) => ({ ...section })),
    metrics: client.metrics.map((metric) => ({
      id: metric.id,
      key: metric.key,
      name: metric.name,
      description: metric.description,
      sectionId: metric.sectionId,
      displayType: metric.displayType,
      valueFormat: metric.valueFormat,
      source: metric.source,
      higherIsBetter: metric.higherIsBetter,
      position: metric.position,
      isVisible: metric.isVisible,
      isDraft: metric.isDraft,
      values: metric.values.map((value) => ({ id: value.id, periodStart: value.periodStart.toISOString(), periodEnd: value.periodEnd.toISOString(), value: value.value.toString(), source: value.source, note: value.note, isOverride: value.isOverride })),
    })),
  };
}

async function loadClient(clientId: string, transaction: { client: typeof prisma.client } = prisma) {
  return transaction.client.findUnique({
    where: { id: clientId },
    include: {
      sections: { orderBy: { position: "asc" } },
      metrics: { include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } },
    },
  }) as Promise<VersionClient | null>;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to view portal versions." }, { status: 401 });
  const { id: clientId } = await params;
  const versions = await prisma.dashboardVersion.findMany({ where: { clientId }, orderBy: { version: "desc" }, take: 20, select: { id: true, version: true, label: true, publishedAt: true } });
  return NextResponse.json({ versions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to publish the client portal." }, { status: 401 });

  const { id: clientId } = await params;
  const body = await request.json().catch(() => null) as { label?: unknown } | null;
  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 100) : "Portal update";

  const version = await prisma.$transaction(async (transaction) => {
    await transaction.section.updateMany({ where: { clientId, kind: { in: ["OVERVIEW", "WEBSITE", "GBP"] }, isVisible: true }, data: { isDraft: false } });
    await transaction.metric.updateMany({ where: { clientId, isVisible: true }, data: { isDraft: false } });
    const client = await loadClient(clientId, transaction);
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const maxVersion = await transaction.dashboardVersion.aggregate({ where: { clientId }, _max: { version: true } });
    const nextVersion = (maxVersion._max.version ?? 0) + 1;
    const saved = await transaction.dashboardVersion.create({ data: { clientId, version: nextVersion, label, snapshot: snapshotFor(client) as Prisma.InputJsonValue } });
    await transaction.auditLog.create({ data: { clientId, actorId: access.user!.id, action: "PORTAL_VERSION_PUBLISHED", entityType: "DashboardVersion", entityId: saved.id, after: { version: nextVersion, label } } });
    return saved;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") return null;
    throw error;
  });

  if (!version) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });
  return NextResponse.json({ version: { id: version.id, version: version.version, label: version.label, publishedAt: version.publishedAt } }, { status: 201 });
}
