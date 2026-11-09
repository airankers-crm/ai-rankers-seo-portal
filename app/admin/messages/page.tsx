import { prisma } from "@ai-rankers/db";
import { ChatWorkspace } from "../../../components/chat-workspace";
import { serializeGroup, serializeMessage } from "../../../lib/chat";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  await requireAdminAccess();
  const [groupRows, clients, participants] = await Promise.all([
    prisma.chatGroup.findMany({ where: { isArchived: false }, orderBy: { updatedAt: "desc" }, include: { client: { select: { businessName: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true, role: true } } } } } }),
    prisma.client.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, clientId: true } }),
  ]);
  const groups = groupRows.map(serializeGroup);
  const initialMessages = groups[0] ? (await prisma.chatMessage.findMany({ where: { groupId: groups[0].id }, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { name: true, role: true } } } })).map(serializeMessage) : [];
  return <ChatWorkspace mode="admin" groups={groups} initialMessages={initialMessages} clients={clients} participants={participants} clientName="AI Rankers" />;
}
