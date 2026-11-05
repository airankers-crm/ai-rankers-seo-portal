import { PortalDashboard } from "../../components/portal-dashboard";
import { prisma } from "@ai-rankers/db";
import type { DemoActivity, DemoMetric, DemoReport } from "@ai-rankers/core";
import { requirePortalAccess } from "../../lib/auth/access";
import type { PortalGoal } from "../../components/goal-highlights";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    select: { id: true, businessName: true, brandMark: true, brandAccent: true },
  });

  if (!client) return <PortalDashboard />;

  const [metrics, activityRecords, reportRecords, goalRecords] = await Promise.all([
    prisma.metric.findMany({ where: { clientId: client.id }, include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } }),
    prisma.activity.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.report.findMany({ where: { clientId: client.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.goal.findMany({
      where: { clientId: client.id, isVisible: true, status: { in: ["ACTIVE", "ACHIEVED"] } },
      include: {
        metric: { include: { values: { orderBy: { periodStart: "desc" }, take: 1 } } },
        annotations: { where: { isVisible: true }, orderBy: { happenedAt: "desc" }, take: 3 },
      },
      orderBy: { endDate: "asc" },
    }),
  ]);

  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric]));
  const mapMetric = (key: string): DemoMetric | undefined => {
    const metric = metricByKey.get(key);
    if (!metric) return undefined;
    return { id: metric.key, label: metric.name, value: Number(metric.values.at(-1)?.value ?? 0), source: metric.source, history: metric.values.map((value) => ({ label: value.periodStart.toLocaleString("en-US", { month: "short" }), value: Number(value.value) })) };
  };

  const organicTraffic = mapMetric("ga4-organic-sessions");
  const impressions = mapMetric("gsc-impressions");
  const topTen = mapMetric("kw-top10");
  const calls = mapMetric("gbp-calls");
  const activities: DemoActivity[] = activityRecords.map((activity) => ({ id: activity.id, title: activity.title, category: activity.category, date: activity.completedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "In progress", status: activity.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS" }));
  const reports: DemoReport[] = reportRecords.map((report) => ({ id: report.id, title: report.title, type: report.type, period: report.periodLabel }));
  const goals: PortalGoal[] = goalRecords.map((goal) => ({ id: goal.id, name: goal.name, description: goal.description, target: Number(goal.target), current: goal.metric?.values[0] ? Number(goal.metric.values[0].value) : null, metricName: goal.metric?.name ?? null, valueFormat: goal.metric?.valueFormat ?? null, condition: goal.condition, status: goal.status, startDate: goal.startDate.toISOString(), endDate: goal.endDate.toISOString(), annotations: goal.annotations.map((annotation) => ({ id: annotation.id, title: annotation.title, body: annotation.body, happenedAt: annotation.happenedAt.toISOString() })) }));

  return <PortalDashboard databaseData={{ businessName: client.businessName, brandMark: client.brandMark, brandAccent: client.brandAccent, metrics: { organicTraffic, impressions, topTen, calls }, activities, reports, goals }} />;
}
