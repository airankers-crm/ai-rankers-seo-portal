import { prisma } from "@ai-rankers/db";
import { demoClient, demoReports } from "@ai-rankers/core";
import { ReportCenter, type ReportListItem } from "../../../components/report-center";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    include: { reports: { where: { isVisible: true }, orderBy: { createdAt: "desc" } } },
  });

  if (!client) {
    const reports: ReportListItem[] = demoReports.map((report) => ({ id: report.id, title: report.title, type: report.type, periodLabel: report.period, status: "PUBLISHED", publishedAt: "2026-11-04T00:00:00.000Z", updatedAt: "2026-11-04T00:00:00.000Z", freshness: "PRESENTATION" }));
    return <ReportCenter clientName={demoClient.businessName} brandMark={demoClient.initials} brandAccent="#F26B38" reports={reports} />;
  }

  const reports: ReportListItem[] = client.reports.map((report) => ({ id: report.id, title: report.title, type: report.type, periodLabel: report.periodLabel, status: report.isVisible ? "PUBLISHED" : "DRAFT", publishedAt: report.createdAt.toISOString(), updatedAt: report.updatedAt.toISOString(), freshness: "PRESENTATION" }));
  return <ReportCenter clientName={client.businessName} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} reports={reports} />;
}
