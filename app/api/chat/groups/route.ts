import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getChatActor, recordChatAudit, serializeGroup } from "../../../../lib/chat";
import { isAdminRole } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to view conversations." }, { status: 401 });

  const groups = await prisma.chatGroup.findMany({
    where: { isArchived: false, ...(isAdminRole(actor.role) ? {} : { clientId: actor.clientId ?? "__no_client__" }) },
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { businessName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true, role: true } } } },
    },
  });

  return NextResponse.json({ groups: groups.map(serializeGroup) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to create a conversation." }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: "Only agency users can create client conversations." }, { status: 403 });

  const body = await request.json().catch(() => null) as { clientId?: string; name?: string; description?: string } | null;
  const clientId = body?.clientId?.trim();
  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;
  if (!clientId || !name) return NextResponse.json({ error: "Client and conversation name are required." }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Conversation name must be 80 characters or fewer." }, { status: 400 });
  if (description && description.length > 180) return NextResponse.json({ error: "Description must be 180 characters or fewer." }, { status: 400 });
  const recentGroups = await prisma.chatGroup.count({ where: { createdById: actor.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentGroups >= 10) return NextResponse.json({ error: "Please wait before creating more conversations." }, { status: 429, headers: { "Retry-After": "60" } });

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, businessName: true } });
  if (!client) return NextResponse.json({ error: "Client workspace was not found." }, { status: 404 });

  const duplicate = await prisma.chatGroup.findUnique({ where: { clientId_name: { clientId, name } }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "A conversation with this name already exists for this client." }, { status: 409 });

  const group = await prisma.chatGroup.create({
    data: { clientId, name, description, createdById: actor.id },
    include: { client: { select: { businessName: true } }, messages: { take: 0, include: { sender: { select: { name: true, role: true } } } } },
  });
  await recordChatAudit(actor.id, clientId, "CHAT_GROUP_CREATED", "ChatGroup", group.id, { name, description });

  return NextResponse.json({ group: serializeGroup(group) }, { status: 201 });
}
