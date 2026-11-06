import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const displayTypes = ["NUMBER_CARD", "PERCENT_CARD", "LINE_CHART", "BAR_CHART", "AREA_CHART", "PROGRESS", "TABLE"] as const;
const valueFormats = ["INTEGER", "DECIMAL", "PERCENT", "CURRENCY", "DURATION_SECONDS", "RANK"] as const;
const sources = ["MANUAL", "GSC", "GA4", "GBP", "DATAFORSEO"] as const;

type CreateMetricBody = {
  key?: unknown;
  name?: unknown;
  description?: unknown;
  sectionId?: unknown;
  displayType?: unknown;
  valueFormat?: unknown;
  source?: unknown;
  higherIsBetter?: unknown;
  isVisible?: unknown;
  publish?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to create a result metric." }, { status: 401 });
  }

  const { id: clientId } = await params;
  const body = await request.json().catch(() => null) as CreateMetricBody | null;
  const key = text(body?.key).toLowerCase();
  const name = text(body?.name);
  const sectionId = text(body?.sectionId);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    return NextResponse.json({ error: "Metric key must use lowercase letters, numbers, and hyphens." }, { status: 400 });
  }
  if (!name || name.length > 80) return NextResponse.json({ error: "Metric name is required and must be 80 characters or fewer." }, { status: 400 });
  if (!sectionId) return NextResponse.json({ error: "A dashboard section is required." }, { status: 400 });

  const section = await prisma.section.findFirst({ where: { id: sectionId, clientId }, select: { id: true } });
  if (!section) return NextResponse.json({ error: "Dashboard section not found for this client." }, { status: 404 });

  const existing = await prisma.metric.findUnique({ where: { clientId_key: { clientId, key } }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "A result metric with this key already exists." }, { status: 409 });

  const displayType = text(body?.displayType) as (typeof displayTypes)[number];
  const valueFormat = text(body?.valueFormat) as (typeof valueFormats)[number];
  const source = text(body?.source) as (typeof sources)[number];
  if (!displayTypes.includes(displayType)) return NextResponse.json({ error: "Invalid display type." }, { status: 400 });
  if (!valueFormats.includes(valueFormat)) return NextResponse.json({ error: "Invalid value format." }, { status: 400 });
  if (!sources.includes(source)) return NextResponse.json({ error: "Invalid metric source." }, { status: 400 });

  const position = ((await prisma.metric.aggregate({ where: { clientId }, _max: { position: true } }))._max.position ?? -1) + 1;
  const metric = await prisma.metric.create({
    data: {
      clientId,
      sectionId,
      key,
      name,
      description: text(body?.description) || null,
      displayType,
      valueFormat,
      source,
      higherIsBetter: body?.higherIsBetter !== false,
      position,
      isVisible: body?.isVisible !== false,
      isDraft: body?.publish !== true,
    },
  });

  await prisma.auditLog.create({
    data: {
      clientId,
      actorId: access.user.id,
      action: "METRIC_RESULT_CREATED",
      entityType: "Metric",
      entityId: metric.id,
      after: { key: metric.key, name: metric.name, source: metric.source, isVisible: metric.isVisible, isDraft: metric.isDraft },
    },
  });

  return NextResponse.json({ metric: { id: metric.id, key: metric.key, name: metric.name, description: metric.description, sectionId: metric.sectionId, displayType: metric.displayType, valueFormat: metric.valueFormat, source: metric.source, higherIsBetter: metric.higherIsBetter, isVisible: metric.isVisible, isDraft: metric.isDraft, values: [] } }, { status: 201 });
}
