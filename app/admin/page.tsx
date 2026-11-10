import { AdminDashboard } from "../../components/admin-dashboard";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminAccess();
  const monthStart = new Date();
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(1);

  const [clients, publishedThisMonth] = await Promise.all([
    prisma.client.findMany({
      orderBy: { businessName: "asc" },
      include: {
        versions: { orderBy: { publishedAt: "desc" }, take: 1, select: { publishedAt: true } },
        metrics: { select: { isDraft: true, isVisible: true } },
        sections: { select: { isDraft: true, isVisible: true } },
        _count: { select: { users: true } },
      },
    }),
    prisma.dashboardVersion.count({ where: { publishedAt: { gte: monthStart } } }),
  ]);

  const databaseClients = clients.map((client) => {
    const draftCount = client.metrics.filter((metric) => metric.isDraft).length + client.sections.filter((section) => section.isDraft).length;
    const latestVersion = client.versions[0]?.publishedAt;
    return {
      id: client.id,
      businessName: client.businessName,
      initials: client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2),
      services: [client.hasWebsiteSeo ? "Website SEO" : "", client.hasGbpSeo ? "GBP SEO" : ""].filter(Boolean),
      status: client.status === "ACTIVE" ? "Active" as const : "Paused" as const,
      lastPublished: latestVersion ? latestVersion.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not published",
      draftCount,
      portalUsers: client._count.users,
      publishedMetrics: client.metrics.filter((metric) => metric.isVisible && !metric.isDraft).length,
    };
  });

  return <AdminDashboard databaseClients={databaseClients} summary={{ publishedThisMonth }} />;
}
