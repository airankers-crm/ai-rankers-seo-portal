import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

const conditions = ["GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL", "EQUALS"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to create goals." }, { status: 401 });

  const { id: clientId } = await params;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });

  const body = await request.json().catch(() => null) as { name?: string; description?: string; metricId?: string; condition?: string; target?: number | string; startDate?: string; endDate?: string; isVisible?: boolean } | null;
  const name = body?.name?.trim();
  const target = Number(body?.target);
  const condition = body?.condition;
  const startDate = body?.startDate ? new Date(body.startDate) : null;
  const endDate = body?.endDate ? new Date(body.endDate) : null;
  if (!name || name.length > 120) return NextResponse.json({ error: "Goal name is required and must be 120 characters or fewer." }, { status: 400 });
  if (!Number.isFinite(target)) return NextResponse.json({ error: "Goal target must be a valid number." }, { status: 400 });
  if (!condition || !conditions.includes(condition as (typeof conditions)[number])) return NextResponse.json({ error: "Choose a valid goal condition." }, { status: 400 });
  if (!startDate || Number.isNaN(startDate.getTime()) || !endDate || Number.isNaN(endDate.getTime()) || endDate < startDate) return NextResponse.json({ error: "Goal dates must be valid and the end date must be on or after the start date." }, { status: 400 });

  if (body?.metricId) {
    const metric = await prisma.metric.findFirst({ where: { id: body.metricId, clientId }, select: { id: true } });
    if (!metric) return NextResponse.json({ error: "Selected metric does not belong to this client." }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      clientId,
      createdById: access.user.id,
      metricId: body?.metricId || null,
      name,
      description: body?.description?.trim() || null,
      condition: condition as (typeof conditions)[number],
      target: new Prisma.Decimal(target),
      startDate,
      endDate,
      isVisible: body?.isVisible ?? true,
    },
    include: { metric: { select: { id: true, name: true, valueFormat: true } } },
  });

  await prisma.auditLog.create({ data: { clientId, actorId: access.user.id, action: "GOAL_CREATED", entityType: "Goal", entityId: goal.id, after: { name: goal.name, metricId: goal.metricId, target: goal.target.toString(), startDate: goal.startDate.toISOString(), endDate: goal.endDate.toISOString(), isVisible: goal.isVisible } } });
  return NextResponse.json({ goal: { ...goal, target: goal.target.toString() } }, { status: 201 });
}
