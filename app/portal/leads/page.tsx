import { prisma } from "@ai-rankers/db";
import { LeadInbox } from "../../../components/lead-inbox";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function PortalLeadsPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: { id: access.user?.clientId ?? "__no_client__" },
    select: { id: true, businessName: true, brandMark: true, brandAccent: true },
  });

  if (!client) return <LeadInbox mode="portal" leads={[]} />;
  const leads = await prisma.lead.findMany({ where: { clientId: client.id }, orderBy: { submittedAt: "desc" }, take: 200 });
  return <LeadInbox mode="portal" businessName={client.businessName} brandMark={client.brandMark} brandAccent={client.brandAccent} leads={leads.map((lead) => ({ id: lead.id, name: lead.name, phone: lead.phone, email: lead.email, service: lead.service, message: lead.message, source: lead.source, status: lead.status, submittedAt: lead.submittedAt.toISOString() }))} />;
}
