import { notFound } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import { ClientReport } from "../../../../components/client-report";
import type { ReportMetricView, ReportPeriodRow, ReportViewModel } from "../../../../lib/reports/types";
import { requirePortalAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "ga4-organic-sessions", label: "Organic clicks", definition: "Sessions attributed to organic search in the selected reporting window.", format: "INTEGER" as const },
  { key: "gsc-impressions", label: "Search impressions", definition: "Search results impressions recorded by Google Search Console.", format: "INTEGER" as const },
  { key: "kw-top10", label: "Keywords in the top 10", definition: "Tracked keywords appearing within the first ten organic results.", format: "RANK" as const },
  { key: "gbp-calls", label: "GBP calls", definition: "Calls attributed to the connected Google Business Profile source.", format: "INTEGER" as const },
] as const;

function periodLabel(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

function metricDirection(change: number | null, higherIsBetter: boolean) {
  if (change === null || Math.abs(change) < 0.05) return "NEUTRAL" as const;
  const positive = higherIsBetter ? change > 0 : change < 0;
  return positive ? "POSITIVE" as const : "NEGATIVE" as const;
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    include: {
      reports: { where: { id, isVisible: true } },
      metrics: { include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  const reportRecord = client?.reports[0];
  if (!client || !reportRecord) notFound();

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const kpis: ReportMetricView[] = metricConfig.flatMap((config) => {
    const metric = metricMap.get(config.key);
    if (!metric) return [];
    const current = metric.values.at(-1);
    const previous = metric.values.at(-2);
    const value = current ? Number(current.value) : null;
    const previousValue = previous ? Number(previous.value) : null;
    const change = value !== null && previousValue !== null && previousValue !== 0 ? ((value - previousValue) / Math.abs(previousValue)) * 100 : null;
    const format = metric.valueFormat === "DURATION_SECONDS" ? "INTEGER" : metric.valueFormat === "PERCENT" ? "PERCENT" : config.format;
    return [{ key: config.key, label: config.label, value, previousValue, change, direction: metricDirection(change, metric.higherIsBetter), definition: config.definition, source: metric.source, lastSyncedAt: null, status: "PRESENTATION", format }];
  });

  const rowMap = new Map<string, ReportPeriodRow>();
  for (const key of ["ga4-organic-sessions", "gsc-impressions", "kw-top10"] as const) {
    const metric = metricMap.get(key);
    for (const value of metric?.values ?? []) {
      const periodStart = value.periodStart.toISOString();
      const row = rowMap.get(periodStart) ?? { periodStart, periodLabel: periodLabel(value.periodStart), organicTraffic: null, impressions: null, topTen: null };
      if (key === "ga4-organic-sessions") row.organicTraffic = Number(value.value);
      if (key === "gsc-impressions") row.impressions = Number(value.value);
      if (key === "kw-top10") row.topTen = Number(value.value);
      rowMap.set(periodStart, row);
    }
  }
  const rows = [...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
  const currentOrganic = kpis.find((metric) => metric.key === "ga4-organic-sessions")?.value;
  const currentTopTen = kpis.find((metric) => metric.key === "kw-top10")?.value;
  const currentCalls = kpis.find((metric) => metric.key === "gbp-calls")?.value;
  const clientMark = client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const activities = client.activities.map((activity) => ({ id: activity.id, date: activity.completedAt ? formatDate(activity.completedAt) : "In progress", type: activity.category, title: activity.title, description: activity.description ?? "The SEO team completed this work as part of the current reporting plan.", status: activity.status === "COMPLETED" ? "Completed" : "In progress", owner: "SEO team", clientVisible: true }));

  const report: ReportViewModel = {
    report: { id: reportRecord.id, title: reportRecord.title, type: reportRecord.type, periodLabel: reportRecord.periodLabel, status: "PUBLISHED", publishedAt: reportRecord.createdAt.toISOString(), updatedAt: reportRecord.updatedAt.toISOString() },
    client: { businessName: client.businessName, brandMark: clientMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl },
    period: { label: reportRecord.periodLabel, comparisonLabel: "Previous reporting period", lastDataContext: "Presentation dataset · source context included" },
    summary: { status: "ON_TRACK", title: "Momentum is building across search and local visibility.", body: `Organic visibility is trending upward for ${client.businessName} in the current presentation dataset. The report connects the strongest measured changes to completed work and highlights where live source connections are still needed before stronger business-outcome claims can be made.`, highlights: [`Organic sessions reached ${currentOrganic?.toLocaleString() ?? "an unavailable value"}.`, `${currentTopTen ?? "No"} keywords are currently shown in the top 10.`, `The report keeps client-visible work and methodology in one place.`], risks: ["GBP calls are visible, but verified lead and revenue attribution is not connected.", "Provider sync health is not yet connected to live integrations."], nextActions: ["Review the service pages attracting organic attention and prioritize conversion improvements.", "Connect and verify live source freshness before using the report for performance commitments.", "Compare keyword movement with completed activities in the next reporting cycle."] },
    kpis,
    websiteSeo: { rows, highlights: [`Organic sessions increased to ${currentOrganic?.toLocaleString() ?? "not connected"}.`, `Top-10 keyword coverage is currently ${currentTopTen?.toLocaleString() ?? "not connected"}.`], opportunities: ["Identify high-impression pages with lower-than-expected click-through behavior.", "Connect page- and query-level Search Console detail for the next report."] },
    localSeo: { metrics: [{ label: "GBP calls", value: currentCalls?.toLocaleString() ?? "Not connected", status: currentCalls === null ? "UNAVAILABLE" : "PRESENTATION", source: "GBP" }, { label: "GBP views", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Website clicks", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Direction requests", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Reviews and sentiment", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Local ranking", value: "Not connected", status: "UNAVAILABLE", source: "RANK_PROVIDER" }], summary: "Local SEO is included as a report section, with the current dataset showing GBP calls while the remaining location signals wait for a connected property." },
    activities,
    recommendations: [{ title: "Turn service-page attention into action", explanation: "Review pages attracting organic sessions and add the clearest next step for a prospective patient or local customer.", evidence: `${currentOrganic?.toLocaleString() ?? "Organic traffic data"} organic sessions are available in the current presentation dataset.`, impact: "High", effort: "Medium", priority: "P1", status: "Proposed" }, { title: "Complete the local visibility connection", explanation: "Connect and verify GBP location data so calls, views, directions, reviews, and local ranking can be interpreted together.", evidence: "GBP calls are present while the remaining local metrics are explicitly unavailable.", impact: "High", effort: "Medium", priority: "P1", status: "Waiting for client" }, { title: "Add query and page-level detail", explanation: "Use Search Console query and page data to find high-impression opportunities that deserve content or conversion work.", evidence: "Search impressions are available, but query and page rows are not connected yet.", impact: "Medium", effort: "Medium", priority: "P2", status: "Proposed" }],
    dataSources: [{ name: "Google Analytics 4", source: "GA4", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Google Search Console", source: "GSC", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Keyword rank source", source: "DATAFORSEO", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Google Business Profile", source: "GBP", status: currentCalls === null ? "UNAVAILABLE" : "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }],
    methodology: ["Organic traffic is represented by the current GA4 metric value and is not a verified lead or revenue measure.", "Search impressions are represented by the current GSC metric value; query and page-level detail are not included in this first report slice.", "Top-10 keyword coverage is represented by the configured rank-source metric and should be read with its source and coverage period.", "The current report uses presentation data. Live sync timestamps will replace this context after provider connections are configured."],
    appendix: [{ label: "Full keyword table", value: "Prepared for live rank-source connection" }, { label: "Full page-performance table", value: "Prepared for Search Console connection" }, { label: "GBP location detail", value: "Prepared for property connection" }, { label: "Activity history", value: `${activities.length} client-visible records` }],
  };

  return <ClientReport report={report} />;
}
