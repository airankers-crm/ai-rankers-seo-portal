import { AdminDashboard } from "../../components/admin-dashboard";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminAccess();
  const clients = await prisma.client.findMany({ orderBy: { businessName: "asc" } });
  return <AdminDashboard databaseClients={clients.map((client) => ({ id: client.id, businessName: client.businessName, initials: client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2), services: [client.hasWebsiteSeo ? "Website SEO" : "", client.hasGbpSeo ? "GBP SEO" : ""].filter(Boolean), status: client.status === "ACTIVE" ? "Active" : "Paused", lastPublished: "Nov 4, 2026" }))} />;
}
