import { prisma } from "@ai-rankers/db";
import { AdminOperationsPage } from "../../../components/admin-operations";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await requireAdminAccess();
  const clients = await prisma.client.findMany({ orderBy: { businessName: "asc" } });
  return <AdminOperationsPage config={{ activeNav: "Clients", title: "Client workspaces", description: "", sourceLabel: "Client accounts", sourceDescription: "Live client records are loaded from the tenant-scoped Neon database.", columns: [{ key: "businessName", label: "Client" }, { key: "services", label: "Services" }, { key: "status", label: "Status" }, { key: "timezone", label: "Timezone" }], rows: clients.map((client) => ({ id: client.id, businessName: client.businessName, services: [client.hasWebsiteSeo ? "Website SEO" : "", client.hasGbpSeo ? "GBP SEO" : ""].filter(Boolean).join(" · ") || "Not configured", status: client.status === "ACTIVE" ? "Active" : client.status === "PAUSED" ? "Paused" : "Archived", timezone: client.timezone })), filters: [{ key: "status", label: "Status", options: ["Active", "Paused", "Archived"] }], emptyTitle: "No client workspaces yet", emptyDescription: "Create the first client workspace to begin onboarding services, sources, and reports.", primaryAction: { label: "Add client", href: "/admin/clients/new" }, rowAction: { label: "Manage portal", hrefPrefix: "/admin/clients/", menu: [{ label: "Workspace details", hrefSuffix: "?step=details" }, { label: "Website SEO", hrefSuffix: "?step=website" }, { label: "GBP performance", hrefSuffix: "?step=gbp" }] } }} />;
}
