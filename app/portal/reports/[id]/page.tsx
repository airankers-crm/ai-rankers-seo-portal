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
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "tony-roofing" },
    include: {
      reports: { where: { id, isVisible: true } },
      metrics: { where: { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "desc" }, take: 24 } }, orderBy: { position: "asc" } },
      activities: { where: { clientVisible: true }, orderBy: { createdAt: "desc" }, take: 8 },
      goals: { where: { isVisible: true, status: { in: ["ACTIVE", "ACHIEVED"] } }, include: { metric: { include: { values: { orderBy: { periodStart: "desc" }, take: 1 } } }, annotations: { where: { isVisible: true }, orderBy: { happenedAt: "desc" }, take: 3 } }, orderBy: { endDate: "asc" } },
    },
  });
  const reportRecord = client?.reports[0];
  if (!client || !reportRecord) notFound();

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const kpis: ReportMetricView[] = metricConfig.flatMap((config) => {
    const metric = metricMap.get(config.key);
    if (!metric) return [];
    const current = metric.values[0];
    const previous = metric.values[1];
    const value = current ? Number(current.value) : null;
    const previousValue = previous ? Number(previous.value) : null;
    const change = value !== null && previousValue !== null && previousValue !== 0 ? ((value - previousValue) / Math.abs(previousValue)) * 100 : null;
    const format = metric.valueFormat === "DURATION_SECONDS" ? "INTEGER" : metric.valueFormat === "PERCENT" ? "PERCENT" : config.format;
    return [{ key: config.key, label: config.label, value, previousValue, change, direction: metricDirection(change, metric.higherIsBetter), definition: config.definition, source: metric.source, lastSyncedAt: null, status: "PRESENTATION", format }];
  });

  const rowMap = new Map<string, ReportPeriodRow>();
  for (const key of ["ga4-organic-sessions", "gsc-impressions", "kw-top10"] as const) {
    const metric = metricMap.get(key);
    for (const value of [...(metric?.values ?? [])].reverse()) {
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
  const activities = client.activities.map((activity) => ({ id: activity.id, date: activity.completedAt ? formatDate(activity.completedAt) : activity.status === "PLANNED" ? "Planned" : "In progress", type: activity.category, title: activity.title, description: activity.description ?? "The SEO team completed this work as part of the current reporting plan.", status: activity.status === "COMPLETED" ? "Completed" : activity.status === "PLANNED" ? "Planned" : "In progress", owner: "SEO team", clientVisible: activity.clientVisible }));
  const goals = client.goals.map((goal) => ({ id: goal.id, name: goal.name, description: goal.description, target: Number(goal.target), current: goal.metric?.values[0] ? Number(goal.metric.values[0].value) : null, metricName: goal.metric?.name ?? null, valueFormat: goal.metric?.valueFormat ?? null, condition: goal.condition, status: goal.status, startDate: goal.startDate.toISOString(), endDate: goal.endDate.toISOString(), annotations: goal.annotations.map((annotation) => ({ id: annotation.id, title: annotation.title, body: annotation.body, happenedAt: annotation.happenedAt.toISOString() })) }));

  const report: ReportViewModel = {
    report: { id: reportRecord.id, title: reportRecord.title, type: reportRecord.type, periodLabel: reportRecord.periodLabel, status: "PUBLISHED", publishedAt: reportRecord.createdAt.toISOString(), updatedAt: reportRecord.updatedAt.toISOString() },
    client: { businessName: client.businessName, brandMark: clientMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl },
    period: { label: reportRecord.periodLabel, comparisonLabel: "Previous reporting period", lastDataContext: "Presentation dataset · source context included" },
    summary: { status: "ON_TRACK", title: "Reporting period summary", body: `${client.businessName} · ${reportRecord.periodLabel}. Current values, previous-period comparison, source coverage, and client-visible delivery records.`, highlights: [`Organic sessions: ${currentOrganic?.toLocaleString() ?? "not connected"}.`, `Keywords in the top 10: ${currentTopTen?.toLocaleString() ?? "not connected"}.`, `${activities.length} client-visible activity record${activities.length === 1 ? "" : "s"}.`], risks: ["GBP calls are available; lead and revenue attribution are not connected.", "Live provider sync health is not connected."], nextActions: ["Review service-page metrics and assign conversion improvements where needed.", "Connect provider sources before using the report for performance commitments.", "Compare keyword movement with completed activities in the next reporting cycle."] },
    crm: { lifecycle: [{ label: "Visibility", status: "AVAILABLE", source: "GA4 · GSC · rank source", detail: "Organic sessions, impressions, and top-10 coverage are visible." }, { label: "Local engagement", status: "PARTIAL", source: "GBP", detail: "Calls are visible; location views, clicks, directions, and reviews are pending." }, { label: "Inquiry capture", status: "NOT_CONNECTED", source: "CRM · forms", detail: "Contact and inquiry events will appear after a lead source is connected." }, { label: "Qualification", status: "NOT_CONNECTED", source: "CRM pipeline", detail: "Lead stages, owners, and qualification movement are not connected yet." }, { label: "Business outcome", status: "NOT_CONNECTED", source: "CRM · revenue", detail: "Verified booked revenue and outcome attribution are planned for a later phase." }], availableNow: ["Branded client report and PDF-ready presentation", "SEO visibility trends and source-aware comparisons", "Shared goals with progress bars and achievement highlights", "Client-visible activity and evidence-based recommendations"], nextConnections: ["Contacts, inquiries, and lead timeline", "Pipeline stages, owners, and conversion rates", "Booked outcomes, revenue, and attribution", "Provider sync health and freshness history"] },
    kpis,
    websiteSeo: { rows, highlights: [`Organic sessions increased to ${currentOrganic?.toLocaleString() ?? "not connected"}.`, `Top-10 keyword coverage is currently ${currentTopTen?.toLocaleString() ?? "not connected"}.`], opportunities: ["Identify high-impression pages with lower-than-expected click-through behavior.", "Connect page- and query-level Search Console detail for the next report."], queryRows: [{ label: "roof repair near me", clicks: 1240, impressions: 18900, ctr: 6.6, position: 4.8 }, { label: "emergency roofing contractor", clicks: 980, impressions: 14100, ctr: 7.0, position: 3.2 }, { label: "metal roofing contractor", clicks: 720, impressions: 11800, ctr: 6.1, position: 8.1 }, { label: "same day roof inspection", clicks: 540, impressions: 9600, ctr: 5.6, position: 7.4 }], pageRows: [{ label: "/services/roof-repair", clicks: 2480, impressions: 31200, ctr: 7.9, position: 4.2 }, { label: "/services/roof-replacement", clicks: 1960, impressions: 26600, ctr: 7.4, position: 5.8 }, { label: "/areas/tony-roofing", clicks: 1420, impressions: 19900, ctr: 7.1, position: 6.4 }, { label: "/services/metal-roofing", clicks: 1120, impressions: 18400, ctr: 6.1, position: 8.7 }] },
    goals,
    localSeo: { metrics: [{ label: "GBP calls", value: currentCalls?.toLocaleString() ?? "Not connected", status: currentCalls === null ? "UNAVAILABLE" : "PRESENTATION", source: "GBP" }, { label: "GBP views", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Website clicks", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Direction requests", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Reviews and sentiment", value: "Not connected", status: "UNAVAILABLE", source: "GBP" }, { label: "Local ranking", value: "Not connected", status: "UNAVAILABLE", source: "RANK_PROVIDER" }], summary: "GBP calls are available in the presentation dataset. Other local metrics require a connected GBP property." },
    activities,
    recommendations: [{ title: "Review service-page conversion actions", explanation: "Review pages with organic sessions and document the relevant service or conversion action.", evidence: `${currentOrganic?.toLocaleString() ?? "Organic traffic data"} organic sessions are available in the current presentation dataset.`, impact: "High", effort: "Medium", priority: "P1", status: "Proposed" }, { title: "Complete the local visibility connection", explanation: "Connect and verify GBP location data so calls, views, directions, reviews, and local ranking can be reviewed together.", evidence: "GBP calls are present while the remaining local metrics are explicitly unavailable.", impact: "High", effort: "Medium", priority: "P1", status: "Waiting for client" }, { title: "Add query and page-level detail", explanation: "Use Search Console query and page data to identify high-impression pages for content or conversion work.", evidence: "Search impressions are available, but query and page rows are not connected yet.", impact: "Medium", effort: "Medium", priority: "P2", status: "Proposed" }],
    dataSources: [{ name: "Google Analytics 4", source: "GA4", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Google Search Console", source: "GSC", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Keyword rank source", source: "DATAFORSEO", status: "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }, { name: "Google Business Profile", source: "GBP", status: currentCalls === null ? "UNAVAILABLE" : "PRESENTATION", lastSuccessfulSync: "Not connected", coverage: reportRecord.periodLabel }],
    methodology: ["Organic traffic is represented by the current GA4 metric value and is not a verified lead or revenue measure.", "Search impressions are represented by the current GSC metric value; query and page-level detail are not included in this first report slice.", "Top-10 keyword coverage is represented by the configured rank-source metric and should be read with its source and coverage period.", "The current report uses presentation data. Live sync timestamps will replace this context after provider connections are configured."],
    appendix: [{ label: "Full keyword table", value: "Prepared for live rank-source connection" }, { label: "Full page-performance table", value: "Prepared for Search Console connection" }, { label: "GBP location detail", value: "Prepared for property connection" }, { label: "Activity history", value: `${activities.length} client-visible records` }],
  };

  return <ClientReport report={report} />;
}
