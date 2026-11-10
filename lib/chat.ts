import { prisma } from "@ai-rankers/db";
import type { ChatGroup, ChatMessage, Client, Prisma, User } from "@prisma/client";
import { getCurrentAppUser, isAdminRole } from "./auth/access";
import { parseSafeHttpUrl } from "./security/urls";

export type ChatActor = Pick<User, "id" | "name" | "email" | "role" | "status" | "clientId">;

export type ChatMessageView = Pick<ChatMessage, "id" | "groupId" | "senderId" | "body" | "attachmentName" | "attachmentUrl" | "editedAt" | "createdAt"> & {
  senderName: string;
  senderRole: User["role"];
};

export type ChatGroupView = Pick<ChatGroup, "id" | "clientId" | "name" | "description" | "isArchived" | "createdAt" | "updatedAt"> & {
  clientName: string;
  lastMessage: ChatMessageView | null;
};

export async function getChatActor(): Promise<ChatActor | null> {
  const user = await getCurrentAppUser();
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export function canAccessClient(actor: ChatActor, clientId: string) {
  return isAdminRole(actor.role) || actor.clientId === clientId;
}

export { isAdminRole };

export function serializeMessage(message: ChatMessage & { sender: Pick<User, "name" | "role"> }): ChatMessageView {
  return {
    id: message.id,
    groupId: message.groupId,
    senderId: message.senderId,
    body: message.body,
    attachmentName: message.attachmentName,
    attachmentUrl: message.attachmentUrl ? parseSafeHttpUrl(message.attachmentUrl) : null,
    editedAt: message.editedAt,
    createdAt: message.createdAt,
    senderName: message.sender.name,
    senderRole: message.sender.role,
  };
}

export function serializeGroup(group: ChatGroup & { client: Pick<Client, "businessName">; messages: Array<ChatMessage & { sender: Pick<User, "name" | "role"> }> }): ChatGroupView {
  return {
    id: group.id,
    clientId: group.clientId,
    name: group.name,
    description: group.description,
    isArchived: group.isArchived,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    clientName: group.client.businessName,
    lastMessage: group.messages[0] ? serializeMessage(group.messages[0]) : null,
  };
}

export async function findAccessibleGroup(actor: ChatActor, groupId: string) {
  const group = await prisma.chatGroup.findUnique({
    where: { id: groupId },
    include: { client: { select: { businessName: true, status: true } } },
  });
  if (!group || group.client.status !== "ACTIVE" && !isAdminRole(actor.role) || !canAccessClient(actor, group.clientId)) return null;
  return group;
}

export async function recordChatAudit(actorId: string, clientId: string, action: string, entityType: string, entityId: string, after?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({
    data: {
      clientId,
      actorId,
      action,
      entityType,
      entityId,
      ...(after ? { after } : {}),
    },
  });
}
