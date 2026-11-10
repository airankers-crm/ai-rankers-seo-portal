import { prisma } from "@ai-rankers/db";
import { ChatWorkspace } from "../../../components/chat-workspace";
import { serializeGroup, serializeMessage } from "../../../lib/chat";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function TeamCommunicationPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({ where: access.user?.clientId ? { id: access.user.clientId } : { slug: "tony-roofing" }, select: { id: true, businessName: true, brandMark: true, brandAccent: true } });
  const clientId = client?.id ?? "";
  const [groupRows, participants] = clientId ? await Promise.all([
    prisma.chatGroup.findMany({ where: { clientId, isArchived: false }, orderBy: { updatedAt: "desc" }, take: 50, include: { client: { select: { businessName: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true, role: true } } } } } }),
    prisma.user.findMany({ where: { status: "ACTIVE", OR: [{ role: { in: ["SUPER_ADMIN", "ADMIN"] } }, { clientId }] }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, email: true, role: true, clientId: true } }),
  ]) : [[], []];
  const groups = groupRows.map(serializeGroup);
  const initialMessages = groups[0] ? (await prisma.chatMessage.findMany({ where: { groupId: groups[0].id }, orderBy: { createdAt: "asc" }, take: 100, include: { sender: { select: { name: true, role: true } } } })).map(serializeMessage) : [];
  return <ChatWorkspace mode="client" groups={groups} initialMessages={initialMessages} participants={participants} clientName={client?.businessName ?? "Tony Roofing"} brandMark={client?.brandMark} brandAccent={client?.brandAccent} />;
}
