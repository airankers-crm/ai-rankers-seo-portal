import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type UpdateMetricBody = {
  name?: unknown;
  description?: unknown;
  value?: unknown;
  periodStart?: unknown;
  periodEnd?: unknown;
  note?: unknown;
  isVisible?: unknown;
  publish?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(value: unknown, endOfDay = false) {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeMetric(metric: { id: string; key: string; name: string; description: string | null; sectionId: string; displayType: string; valueFormat: string; source: string; higherIsBetter: boolean; isVisible: boolean; isDraft: boolean; values: Array<{ id: string; periodStart: Date; periodEnd: Date; value: Prisma.Decimal; source: string; note: string | null; isOverride: boolean }> }) {
  return {
    id: metric.id,
    key: metric.key,
    name: metric.name,
    description: metric.description,
    sectionId: metric.sectionId,
    displayType: metric.displayType,
    valueFormat: metric.valueFormat,
    source: metric.source,
    higherIsBetter: metric.higherIsBetter,
    isVisible: metric.isVisible,
    isDraft: metric.isDraft,
    values: metric.values.map((value) => ({ id: value.id, periodStart: value.periodStart.toISOString(), periodEnd: value.periodEnd.toISOString(), value: value.value.toString(), source: value.source, note: value.note, isOverride: value.isOverride })),
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; metricId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to update a result metric." }, { status: 401 });
  }

  const { id: clientId, metricId } = await params;
  const existing = await prisma.metric.findFirst({ where: { id: metricId, clientId }, include: { values: { orderBy: { periodStart: "desc" }, take: 1 } } });
  if (!existing) return NextResponse.json({ error: "Result metric not found for this client." }, { status: 404 });

  const body = await request.json().catch(() => null) as UpdateMetricBody | null;
  const name = text(body?.name);
  if (!name || name.length > 80) return NextResponse.json({ error: "Metric name is required and must be 80 characters or fewer." }, { status: 400 });

  const valueText = body?.value === undefined ? "" : String(body.value).trim();
  const numericValue = Number(valueText);
  if (!valueText || !Number.isFinite(numericValue)) return NextResponse.json({ error: "Enter a valid numeric result value." }, { status: 400 });

  const fallbackStart = existing.values[0]?.periodStart ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const fallbackEnd = existing.values[0]?.periodEnd ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const periodStart = parseDateOnly(body?.periodStart) ?? fallbackStart;
  const periodEnd = parseDateOnly(body?.periodEnd, true) ?? fallbackEnd;
  if (periodEnd < periodStart) return NextResponse.json({ error: "The reporting end date must be on or after the start date." }, { status: 400 });

  const updated = await prisma.$transaction(async (transaction) => {
    const metric = await transaction.metric.update({
      where: { id: metricId },
      data: {
        name,
        description: text(body?.description) || null,
        isVisible: body?.isVisible !== false,
        isDraft: body?.publish !== true,
      },
    });
    await transaction.metricValue.upsert({
      where: { metricId_periodStart_periodEnd_source: { metricId, periodStart, periodEnd, source: existing.source } },
      create: { metricId, periodStart, periodEnd, value: new Prisma.Decimal(valueText), source: existing.source, note: text(body?.note) || null, isOverride: true },
      update: { value: new Prisma.Decimal(valueText), note: text(body?.note) || null, isOverride: true },
    });
    await transaction.auditLog.create({
      data: {
        clientId,
        actorId: access.user!.id,
        action: "METRIC_RESULT_UPDATED",
        entityType: "Metric",
        entityId: metric.id,
        before: { name: existing.name, isVisible: existing.isVisible, isDraft: existing.isDraft, latestValue: existing.values[0]?.value.toString() ?? null },
        after: { name: metric.name, isVisible: metric.isVisible, isDraft: metric.isDraft, latestValue: valueText, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
      },
    });
    return transaction.metric.findUniqueOrThrow({ where: { id: metric.id }, include: { values: { orderBy: { periodStart: "desc" }, take: 6 } } });
  });

  return NextResponse.json({ metric: serializeMetric(updated) });
}
