import { PortalDashboard } from "../../components/portal-dashboard";
import { prisma } from "@ai-rankers/db";
import type { DemoActivity, DemoMetric, DemoReport } from "@ai-rankers/core";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const client = await prisma.client.findUnique({
    where: { slug: "riverstone-dental" },
    include: {
      metrics: { include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 3 },
      reports: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  if (!client) return <PortalDashboard />;

  const metricByKey = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const mapMetric = (key: string): DemoMetric | undefined => {
    const metric = metricByKey.get(key);
    if (!metric) return undefined;
    return { id: metric.key, label: metric.name, value: Number(metric.values.at(-1)?.value ?? 0), source: metric.source, history: metric.values.map((value) => ({ label: value.periodStart.toLocaleString("en-US", { month: "short" }), value: Number(value.value) })) };
  };

  const organicTraffic = mapMetric("ga4-organic-sessions");
  const impressions = mapMetric("gsc-impressions");
  const topTen = mapMetric("kw-top10");
  const calls = mapMetric("gbp-calls");
  const activities: DemoActivity[] = client.activities.map((activity) => ({ id: activity.id, title: activity.title, category: activity.category, date: activity.completedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "In progress", status: activity.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS" }));
  const reports: DemoReport[] = client.reports.map((report) => ({ id: report.id, title: report.title, type: report.type, period: report.periodLabel }));

  return <PortalDashboard databaseData={{ businessName: client.businessName, metrics: { organicTraffic, impressions, topTen, calls }, activities, reports }} />;
}
