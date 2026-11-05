import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; goalId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to add milestones." }, { status: 401 });

  const { id: clientId, goalId } = await params;
  const goal = await prisma.goal.findFirst({ where: { id: goalId, clientId }, select: { id: true } });
  if (!goal) return NextResponse.json({ error: "Goal not found in this client workspace." }, { status: 404 });

  const body = await request.json().catch(() => null) as { title?: string; body?: string; happenedAt?: string; isVisible?: boolean } | null;
  const title = body?.title?.trim();
  const happenedAt = body?.happenedAt ? new Date(body.happenedAt) : new Date();
  if (!title || title.length > 140) return NextResponse.json({ error: "Milestone title is required and must be 140 characters or fewer." }, { status: 400 });
  if (Number.isNaN(happenedAt.getTime())) return NextResponse.json({ error: "Milestone date must be valid." }, { status: 400 });

  const annotation = await prisma.goalAnnotation.create({ data: { goalId, createdById: access.user.id, title, body: body?.body?.trim() || null, happenedAt, isVisible: body?.isVisible ?? true } });
  await prisma.auditLog.create({ data: { clientId, actorId: access.user.id, action: "GOAL_ANNOTATION_CREATED", entityType: "GoalAnnotation", entityId: annotation.id, after: { goalId, title: annotation.title, happenedAt: annotation.happenedAt.toISOString(), isVisible: annotation.isVisible } } });
  return NextResponse.json({ annotation }, { status: 201 });
}
