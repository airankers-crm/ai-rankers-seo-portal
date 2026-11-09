import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getChatActor, recordChatAudit } from "../../../../../lib/chat";
import { isAdminRole } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to update a conversation." }, { status: 401 });
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: "Only agency users can update conversations." }, { status: 403 });
  const { id } = await context.params;
  const existing = await prisma.chatGroup.findUnique({ where: { id }, select: { id: true, clientId: true, name: true } });
  if (!existing) return NextResponse.json({ error: "Conversation was not found." }, { status: 404 });

  const body = await request.json().catch(() => null) as { name?: string; description?: string; isArchived?: boolean } | null;
  const name = body?.name?.trim();
  const description = body?.description?.trim();
  if (name !== undefined && !name) return NextResponse.json({ error: "Conversation name cannot be empty." }, { status: 400 });
  if (name && name.length > 80) return NextResponse.json({ error: "Conversation name must be 80 characters or fewer." }, { status: 400 });
  if (description !== undefined && description.length > 180) return NextResponse.json({ error: "Description must be 180 characters or fewer." }, { status: 400 });

  try {
    const group = await prisma.chatGroup.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(typeof body?.isArchived === "boolean" ? { isArchived: body.isArchived } : {}),
      },
      include: { client: { select: { businessName: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true, role: true } } } } },
    });
    await recordChatAudit(actor.id, group.clientId, "CHAT_GROUP_UPDATED", "ChatGroup", group.id, { name: group.name, description: group.description, isArchived: group.isArchived });
    return NextResponse.json({ group });
  } catch {
    return NextResponse.json({ error: "A conversation with this name already exists for this client." }, { status: 409 });
  }
}
