import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getChatActor, isAdminRole, recordChatAudit, serializeMessage } from "../../../../../lib/chat";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to edit messages." }, { status: 401 });
  const { messageId } = await context.params;
  const existing = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { group: { select: { clientId: true } }, sender: { select: { name: true, role: true } } } });
  if (!existing) return NextResponse.json({ error: "Message was not found." }, { status: 404 });
  if (!isAdminRole(actor.role) && existing.senderId !== actor.id) return NextResponse.json({ error: "You can only edit your own messages." }, { status: 403 });
  if (!canAccessMessage(actor.clientId, actor.role, existing.group.clientId)) return NextResponse.json({ error: "You do not have access to this conversation." }, { status: 403 });

  const body = await request.json().catch(() => null) as { body?: string } | null;
  const messageBody = body?.body?.trim() ?? "";
  if (!messageBody) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (messageBody.length > 4000) return NextResponse.json({ error: "Messages must be 4,000 characters or fewer." }, { status: 400 });

  const message = await prisma.chatMessage.update({ where: { id: messageId }, data: { body: messageBody, editedAt: new Date() }, include: { sender: { select: { name: true, role: true } } } });
  await recordChatAudit(actor.id, existing.group.clientId, "CHAT_MESSAGE_EDITED", "ChatMessage", message.id, { groupId: existing.groupId });
  return NextResponse.json({ message: serializeMessage(message) });
}

function canAccessMessage(clientId: string | null, role: "SUPER_ADMIN" | "ADMIN" | "CLIENT", groupClientId: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || clientId === groupClientId;
}
