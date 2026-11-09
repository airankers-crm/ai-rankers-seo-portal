import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type Snapshot = {
  sections?: Array<{ id: string; name: string; position: number; isVisible: boolean; isDraft: boolean }>;
  metrics?: Array<{ id: string; name: string; description: string | null; sectionId: string; displayType: string; valueFormat: string; source: string; higherIsBetter: boolean; position: number; isVisible: boolean; isDraft: boolean; values: Array<{ periodStart: string; periodEnd: string; value: string; source: string; note: string | null; isOverride: boolean }> }>;
};

function isSnapshot(value: Prisma.JsonValue): value is Snapshot {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to roll back the client portal." }, { status: 401 });

  const { id: clientId, versionId } = await params;
  const source = await prisma.dashboardVersion.findFirst({ where: { id: versionId, clientId } });
  if (!source || !isSnapshot(source.snapshot)) return NextResponse.json({ error: "Portal version not found or is not restorable." }, { status: 404 });
  const snapshot = source.snapshot;
  if (!Array.isArray(snapshot.sections) || !Array.isArray(snapshot.metrics)) return NextResponse.json({ error: "This portal version does not contain a complete presentation snapshot." }, { status: 400 });

  const created = await prisma.$transaction(async (transaction) => {
    const sectionIds = snapshot.sections!.map((section) => section.id);
    const metricIds = snapshot.metrics!.map((metric) => metric.id);
    await transaction.section.updateMany({ where: { clientId, ...(sectionIds.length ? { id: { notIn: sectionIds } } : {}) }, data: { isVisible: false, isDraft: true } });
    await transaction.metric.updateMany({ where: { clientId, ...(metricIds.length ? { id: { notIn: metricIds } } : {}) }, data: { isVisible: false, isDraft: true } });
    for (const section of snapshot.sections!) {
      await transaction.section.updateMany({ where: { id: section.id, clientId }, data: { name: section.name, position: section.position, isVisible: section.isVisible, isDraft: section.isDraft } });
    }
    for (const metric of snapshot.metrics!) {
      const exists = await transaction.metric.findFirst({ where: { id: metric.id, clientId } });
      if (!exists) continue;
      await transaction.metric.update({ where: { id: metric.id }, data: { name: metric.name, description: metric.description, sectionId: metric.sectionId, displayType: metric.displayType as never, valueFormat: metric.valueFormat as never, source: metric.source as never, higherIsBetter: metric.higherIsBetter, position: metric.position, isVisible: metric.isVisible, isDraft: metric.isDraft } });
      await transaction.metricValue.deleteMany({ where: { metricId: metric.id } });
      if (metric.values.length) await transaction.metricValue.createMany({ data: metric.values.map((value) => ({ metricId: metric.id, periodStart: new Date(value.periodStart), periodEnd: new Date(value.periodEnd), value: new Prisma.Decimal(value.value), source: value.source as never, note: value.note, isOverride: value.isOverride })) });
    }
    const client = await transaction.client.findUnique({ where: { id: clientId }, include: { sections: { orderBy: { position: "asc" } }, metrics: { include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } } }) as Parameters<typeof snapshotFor>[0] | null;
    if (!client) throw new Error("CLIENT_NOT_FOUND");
    const maxVersion = await transaction.dashboardVersion.aggregate({ where: { clientId }, _max: { version: true } });
    const saved = await transaction.dashboardVersion.create({ data: { clientId, version: (maxVersion._max.version ?? 0) + 1, label: `Rollback to v${source.version}`, snapshot: snapshotFor(client) as Prisma.InputJsonValue } });
    await transaction.auditLog.create({ data: { clientId, actorId: access.user!.id, action: "PORTAL_VERSION_ROLLED_BACK", entityType: "DashboardVersion", entityId: saved.id, before: { sourceVersion: source.version }, after: { version: saved.version, label: saved.label } } });
    return saved;
  }).catch((error) => {
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") return null;
    throw error;
  });

  if (!created) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });
  return NextResponse.json({ version: { id: created.id, version: created.version, label: created.label, publishedAt: created.publishedAt } });
}

function snapshotFor(client: Parameters<typeof snapshotForClient>[0]) {
  return snapshotForClient(client);
}

function snapshotForClient(client: { id: string; businessName: string; brandMark: string | null; brandAccent: string; websiteUrl: string | null; sections: Array<{ id: string; name: string; kind: string; position: number; isVisible: boolean; isDraft: boolean }>; metrics: Array<{ id: string; key: string; name: string; description: string | null; sectionId: string; displayType: string; valueFormat: string; source: string; higherIsBetter: boolean; position: number; isVisible: boolean; isDraft: boolean; values: Array<{ id: string; periodStart: Date; periodEnd: Date; value: Prisma.Decimal; source: string; note: string | null; isOverride: boolean }> }> }) {
  return { client: { id: client.id, businessName: client.businessName, brandMark: client.brandMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl }, sections: client.sections.map((section) => ({ ...section })), metrics: client.metrics.map((metric) => ({ ...metric, values: metric.values.map((value) => ({ id: value.id, periodStart: value.periodStart.toISOString(), periodEnd: value.periodEnd.toISOString(), value: value.value.toString(), source: value.source, note: value.note, isOverride: value.isOverride })) })) };
}
