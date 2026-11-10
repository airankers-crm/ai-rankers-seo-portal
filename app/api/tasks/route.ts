import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess, isAdminRole } from "../../../lib/auth/access";
import { createClientTask, listClientTasks } from "../../../lib/tasks";

export async function GET() {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Client authentication is required to view tasks." }, { status: 401 });
  }

  const clientId = access.user.clientId;
  if (!clientId) return NextResponse.json({ tasks: [] });
  const tasks = await listClientTasks(clientId);
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Client authentication is required to create a task." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { title?: string; description?: string; category?: string; priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT"; dueDate?: string; clientId?: string; assigneeId?: string } | null;
  const title = body?.title?.trim();
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  if (title.length > 160) return NextResponse.json({ error: "Task title must be 160 characters or fewer." }, { status: 400 });
  if (body?.description && body.description.trim().length > 2000) return NextResponse.json({ error: "Task context must be 2,000 characters or fewer." }, { status: 400 });
  if (body?.category && body.category.trim().length > 80) return NextResponse.json({ error: "Task category must be 80 characters or fewer." }, { status: 400 });
  if (body?.priority && !["LOW", "NORMAL", "HIGH", "URGENT"].includes(body.priority)) return NextResponse.json({ error: "Choose a valid task priority." }, { status: 400 });
  const dueDate = body?.dueDate ? new Date(body.dueDate) : null;
  if (body?.dueDate && (!dueDate || Number.isNaN(dueDate.getTime()))) return NextResponse.json({ error: "Choose a valid requested due date." }, { status: 400 });

  const currentUser = access.user;
  const clientId = isAdminRole(currentUser.role) && body?.clientId ? body.clientId : currentUser.clientId;
  if (!clientId) return NextResponse.json({ error: "A client workspace is required." }, { status: 400 });
  if (body?.assigneeId && !isAdminRole(currentUser.role)) return NextResponse.json({ error: "Only agency users can assign a task directly." }, { status: 403 });
  const assigneeId = body?.assigneeId?.trim() || null;
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { clientId: true, role: true, status: true } });
    const allowed = Boolean(assignee && assignee.status === "ACTIVE" && (isAdminRole(assignee.role) || assignee.clientId === clientId));
    if (!allowed) return NextResponse.json({ error: "The assignee is not active in this client workspace." }, { status: 400 });
  }
  const recentTasks = await prisma.task.count({ where: { requesterId: currentUser.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentTasks >= 10) return NextResponse.json({ error: "Please wait before creating more task requests." }, { status: 429, headers: { "Retry-After": "60" } });

  const task = await createClientTask({ clientId, title, description: body?.description?.trim() || null, category: body?.category?.trim() || "Client request", priority: body?.priority ?? "NORMAL", dueDate, assigneeId, requesterId: currentUser.id });
  if (!task) return NextResponse.json({ error: "The task was not created." }, { status: 500 });
  return NextResponse.json({ task }, { status: 201 });
}
