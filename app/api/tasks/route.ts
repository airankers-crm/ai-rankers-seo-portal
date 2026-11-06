import { NextResponse } from "next/server";
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

  const currentUser = access.user;
  const clientId = isAdminRole(currentUser.role) && body?.clientId ? body.clientId : currentUser.clientId;
  if (!clientId) return NextResponse.json({ error: "A client workspace is required." }, { status: 400 });
  if (body?.assigneeId && !isAdminRole(currentUser.role)) return NextResponse.json({ error: "Only agency users can assign a task directly." }, { status: 403 });

  const task = await createClientTask({ clientId, title, description: body?.description?.trim() || null, category: body?.category?.trim() || "Client request", priority: body?.priority ?? "NORMAL", dueDate: body?.dueDate ? new Date(body.dueDate) : null, assigneeId: body?.assigneeId || null, requesterId: currentUser.id });
  if (!task) return NextResponse.json({ error: "The task was not created." }, { status: 500 });
  return NextResponse.json({ task }, { status: 201 });
}
