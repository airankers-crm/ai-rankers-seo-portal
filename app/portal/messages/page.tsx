import { prisma } from "@ai-rankers/db";
import { TeamCommunication } from "../../../components/team-communication";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function TeamCommunicationPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({ where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" }, select: { businessName: true, brandMark: true, brandAccent: true } });
  return <TeamCommunication businessName={client?.businessName ?? "Riverstone Dental"} brandMark={client?.brandMark} brandAccent={client?.brandAccent} />;
}
