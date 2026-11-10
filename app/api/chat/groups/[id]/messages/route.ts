import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { canAccessClient, findAccessibleGroup, getChatActor, recordChatAudit, serializeMessage } from "../../../../../../lib/chat";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to view messages." }, { status: 401 });
  const { id } = await context.params;
  const group = await findAccessibleGroup(actor, id);
  if (!group) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { sender: { select: { name: true, role: true } } },
  });
  return NextResponse.json({ messages: messages.reverse().map(serializeMessage) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getChatActor();
  if (!actor) return NextResponse.json({ error: "Authentication is required to send a message." }, { status: 401 });
  const { id } = await context.params;
  const group = await findAccessibleGroup(actor, id);
  if (!group) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (group.isArchived) return NextResponse.json({ error: "Archived conversations cannot receive new messages." }, { status: 409 });

  const body = await request.json().catch(() => null) as { body?: string; attachmentName?: string; attachmentUrl?: string } | null;
  const messageBody = body?.body?.trim() ?? "";
  const attachmentName = body?.attachmentName?.trim() || null;
  const attachmentUrl = body?.attachmentUrl?.trim() || null;
  if (!messageBody && !attachmentUrl) return NextResponse.json({ error: "Write a message or add a document link." }, { status: 400 });
  if (messageBody.length > 4000) return NextResponse.json({ error: "Messages must be 4,000 characters or fewer." }, { status: 400 });
  if (attachmentName && attachmentName.length > 140) return NextResponse.json({ error: "Document name must be 140 characters or fewer." }, { status: 400 });
  if (attachmentUrl) {
    try { new URL(attachmentUrl); } catch { return NextResponse.json({ error: "Document link must be a valid URL." }, { status: 400 }); }
  }
  const recentMessages = await prisma.chatMessage.count({ where: { senderId: actor.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentMessages >= 30) return NextResponse.json({ error: "Please wait before sending more messages." }, { status: 429, headers: { "Retry-After": "60" } });

  const message = await prisma.$transaction(async (transaction) => {
    const created = await transaction.chatMessage.create({ data: { groupId: id, senderId: actor.id, body: messageBody, attachmentName, attachmentUrl }, include: { sender: { select: { name: true, role: true } } } });
    await transaction.chatGroup.update({ where: { id }, data: { updatedAt: new Date() } });
    return created;
  });
  if (canAccessClient(actor, group.clientId)) await recordChatAudit(actor.id, group.clientId, "CHAT_MESSAGE_CREATED", "ChatMessage", message.id, { groupId: id, hasAttachment: Boolean(attachmentUrl) });
  return NextResponse.json({ message: serializeMessage(message) }, { status: 201 });
}
