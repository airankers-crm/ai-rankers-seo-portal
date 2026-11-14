import { prisma } from "@ai-rankers/db";
import { ReportCenter, type ReportListItem, type ReportService } from "../../../components/report-center";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

function getReportService(type: string, title: string): ReportService {
  const value = (type + " " + title).toLowerCase();
  return value.includes("gbp") || value.includes("local") ? "GBP performance" : "Website SEO";
}

function getReportKind(periodLabel: string, type: string): ReportListItem["kind"] {
  const value = (periodLabel + " " + type).toLowerCase();
  return /monthly|january|february|march|april|may|june|july|august|september|october|november|december/.test(value) ? "MONTHLY" : "OTHER";
}

export default async function ReportsPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: { id: access.user?.clientId ?? "__no_client__" },
    include: { reports: { where: { isVisible: true }, orderBy: { createdAt: "desc" }, take: 50 } },
  });

  if (!client) {
    return <ReportCenter clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" reports={[]} />;
  }

  const reports: ReportListItem[] = client.reports.map((report) => ({ id: report.id, title: report.title, type: report.type, service: getReportService(report.type, report.title), kind: getReportKind(report.periodLabel, report.type), periodLabel: report.periodLabel, status: report.deliveryStatus === "SENT" ? "SENT" : report.status, publishedAt: report.createdAt.toISOString(), updatedAt: report.updatedAt.toISOString(), freshness: "PRESENTATION", hasFile: Boolean(report.storageKey), originalFileName: report.originalFileName, fileSizeBytes: report.sizeBytes }));
  return <ReportCenter clientName={client.businessName} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} reports={reports} />;
}
