import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getCurrentAppUser, requirePortalAccess, isAdminRole } from "../../../lib/auth/access";
import { createClientTask, listClientTasks } from "../../../lib/tasks";

export async function GET() {
  const access = await requirePortalAccess();
  const clientId = access.user?.clientId ?? (await prisma.client.findUnique({ where: { slug: "riverstone-dental" }, select: { id: true } }))?.id;
  if (!clientId) return NextResponse.json({ tasks: [] });
  const tasks = await listClientTasks(clientId);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  await requirePortalAccess();
  const body = await request.json().catch(() => null) as { title?: string; description?: string; category?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"; dueDate?: string; clientId?: string; assigneeId?: string } | null;
  const title = body?.title?.trim();
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

  const currentUser = await getCurrentAppUser();
  const fallbackClient = await prisma.client.findUnique({ where: { slug: "riverstone-dental" }, select: { id: true } });
  const clientId = isAdminRole(currentUser?.role ?? "CLIENT") && body?.clientId ? body.clientId : currentUser?.clientId ?? fallbackClient?.id;
  if (!clientId) return NextResponse.json({ error: "A client workspace is required." }, { status: 400 });
  if (body?.assigneeId && !isAdminRole(currentUser?.role ?? "CLIENT")) return NextResponse.json({ error: "Only agency users can assign a task directly." }, { status: 403 });

  const task = await createClientTask({ clientId, title, description: body?.description?.trim() || null, category: body?.category?.trim() || "Client request", priority: body?.priority ?? "NORMAL", dueDate: body?.dueDate ? new Date(body.dueDate) : null, assigneeId: body?.assigneeId || null, requesterId: currentUser?.id ?? null });
  if (!task) return NextResponse.json({ error: "The task was not created." }, { status: 500 });
  return NextResponse.json({ task }, { status: 201 });
}
