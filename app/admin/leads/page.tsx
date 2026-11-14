import { prisma } from "@ai-rankers/db";
import { LeadInbox } from "../../../components/lead-inbox";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  await requireAdminAccess();
  const leads = await prisma.lead.findMany({ include: { client: { select: { businessName: true } } }, orderBy: { submittedAt: "desc" }, take: 200 });
  return <LeadInbox mode="admin" leads={leads.map((lead) => ({ id: lead.id, clientName: lead.client.businessName, name: lead.name, phone: lead.phone, email: lead.email, service: lead.service, message: lead.message, source: lead.source, status: lead.status, submittedAt: lead.submittedAt.toISOString() }))} />;
}
