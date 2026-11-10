import { PortalOverviewDashboard } from "../../components/portal-overview-dashboard";
import { prisma } from "@ai-rankers/db";
import type { DemoActivity, DemoMetric, DemoReport } from "@ai-rankers/core";
import { requirePortalAccess } from "../../lib/auth/access";
import type { PortalGoal } from "../../components/goal-highlights";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

function getCachedPortalData(clientId: string) {
  return unstable_cache(async () => {
    const [metrics, activityRecords, reportRecords, goalRecords] = await Promise.all([
      prisma.metric.findMany({ where: { clientId, isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "desc" }, take: 6 } }, orderBy: { position: "asc" } }),
      prisma.activity.findMany({ where: { clientId, clientVisible: true }, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.report.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.goal.findMany({
        where: { clientId, isVisible: true, status: { in: ["ACTIVE", "ACHIEVED"] } },
        include: { metric: { include: { values: { orderBy: { periodStart: "desc" }, take: 1 } } }, annotations: { where: { isVisible: true }, orderBy: { happenedAt: "desc" }, take: 3 } },
        orderBy: { endDate: "asc" },
      }),
    ]);

    return {
      metrics: metrics.map((metric) => ({ key: metric.key, name: metric.name, source: metric.source, updatedAt: metric.updatedAt.toISOString(), values: metric.values.map((value) => ({ periodStart: value.periodStart.toISOString(), value: Number(value.value) })) })),
      activities: activityRecords.map((activity) => ({ id: activity.id, title: activity.title, category: activity.category, completedAt: activity.completedAt?.toISOString() ?? null, status: activity.status })),
      reports: reportRecords.map((report) => ({ id: report.id, title: report.title, type: report.type, period: report.periodLabel })),
      goals: goalRecords.map((goal) => ({ id: goal.id, name: goal.name, description: goal.description, target: Number(goal.target), current: goal.metric?.values[0] ? Number(goal.metric.values[0].value) : null, metricName: goal.metric?.name ?? null, valueFormat: goal.metric?.valueFormat ?? null, condition: goal.condition, status: goal.status, startDate: goal.startDate.toISOString(), endDate: goal.endDate.toISOString(), annotations: goal.annotations.map((annotation) => ({ id: annotation.id, title: annotation.title, body: annotation.body, happenedAt: annotation.happenedAt.toISOString() })) })),
    };
  }, ["portal-overview-data", clientId], { revalidate: 60, tags: [`portal-overview:${clientId}`] })();
}

export default async function PortalPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "tony-roofing" },
    select: { id: true, businessName: true, brandMark: true, brandAccent: true },
  });

  if (!client) return <PortalOverviewDashboard />;

  const { metrics, activities: activityRecords, reports: reportRecords, goals: goalRecords } = await getCachedPortalData(client.id);

  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const mapMetric = (key: string): DemoMetric | undefined => {
    const metric = metricByKey.get(key);
    if (!metric) return undefined;
    return { id: metric.key, label: metric.name, value: Number(metric.values[0]?.value ?? 0), source: metric.source, history: [...metric.values].reverse().map((value) => ({ label: new Date(value.periodStart).toLocaleString("en-US", { month: "short", timeZone: "UTC" }), value: Number(value.value) })) };
  };

  const organicTraffic = mapMetric("ga4-organic-sessions");
  const impressions = mapMetric("gsc-impressions");
  const topTen = mapMetric("kw-top10");
  const calls = mapMetric("gbp-calls");
  const gbpViews = mapMetric("gbp-views");
  const gbpWebsiteClicks = mapMetric("gbp-website-clicks");
  const gbpDirections = mapMetric("gbp-directions");
  const gbpReviews = mapMetric("gbp-reviews");
  const activities: DemoActivity[] = activityRecords.map((activity) => ({ id: activity.id, title: activity.title, category: activity.category, date: activity.completedAt ? new Date(activity.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : activity.status === "PLANNED" ? "Planned" : "In progress", status: activity.status }));
  const reports: DemoReport[] = reportRecords.map((report) => ({ id: report.id, title: report.title, type: report.type, period: report.period }));
  const latestUpdatedAt = metrics.reduce((latest, metric) => new Date(metric.updatedAt) > latest ? new Date(metric.updatedAt) : latest, new Date(0)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const goals: PortalGoal[] = goalRecords;

  return <PortalOverviewDashboard databaseData={{ businessName: client.businessName, brandMark: client.brandMark, brandAccent: client.brandAccent, lastUpdated: latestUpdatedAt, metrics: { organicTraffic, impressions, topTen, calls, gbpViews, gbpWebsiteClicks, gbpDirections, gbpReviews }, activities, reports, goals }} />;
}
