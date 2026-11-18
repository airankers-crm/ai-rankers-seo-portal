import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../lib/auth/access";
import { AnalyticsDashboard, type AnalyticsMetric, type AnalyticsRow } from "../../../components/analytics-dashboard";
import { CsvImportPanel } from "../../../components/csv-import-panel";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "ga4-active-users", viewKey: "activeUsers", label: "Active users", description: "Unique users who visited the website during the reporting period.", format: "INTEGER" as const },
  { key: "ga4-sessions", viewKey: "sessions", label: "Sessions", description: "Visits recorded by Google Analytics 4.", format: "INTEGER" as const },
  { key: "ga4-organic-sessions", viewKey: "organicSessions", label: "Organic sessions", description: "Sessions attributed to unpaid organic search.", format: "INTEGER" as const },
  { key: "ga4-views", viewKey: "views", label: "Views", description: "Screens and pages viewed across the website.", format: "INTEGER" as const },
  { key: "ga4-engaged-sessions", viewKey: "engagedSessions", label: "Engaged sessions", description: "Sessions that met the GA4 engagement criteria.", format: "INTEGER" as const },
  { key: "ga4-engagement-rate", viewKey: "engagementRate", label: "Engagement rate", description: "The percentage of sessions that were engaged.", format: "PERCENT" as const },
  { key: "ga4-event-count", viewKey: "eventCount", label: "Event count", description: "The total number of events recorded by Google Analytics 4.", format: "INTEGER" as const },
  { key: "ga4-key-events", viewKey: "keyEvents", label: "Key events", description: "Configured conversion events such as form submissions or phone clicks.", format: "INTEGER" as const },
  { key: "ga4-phone-clicks", viewKey: "phoneClicks", label: "Phone clicks", description: "Clicks on tracked phone links.", format: "INTEGER" as const },
  { key: "ga4-form-submissions", viewKey: "formSubmissions", label: "Form submissions", description: "Contact-form submissions recorded as GA4 events.", format: "INTEGER" as const },
  { key: "ga4-quote-requests", viewKey: "quoteRequests", label: "Quote requests", description: "Quote-request events configured as conversions.", format: "INTEGER" as const },
] as const;

type MetricKey = typeof metricConfig[number]["viewKey"];

async function getAnalyticsClient(clientId: string) {
  const settings = await prisma.client.findUnique({ where: { id: clientId }, select: { dataMode: true } });
  if (!settings) return null;
  return prisma.client.findUnique({
    where: { id: clientId },
    include: { metrics: { where: { source: "GA4", isVisible: true, isDraft: false }, include: { values: { where: { dataOrigin: settings.dataMode }, orderBy: { periodStart: "desc" }, take: 12 } }, orderBy: { position: "asc" } } },
  });
}

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function AnalyticsPage() {
  const access = await requirePortalAccess();
  const clientId = access.user?.clientId;
  const client = clientId ? await getAnalyticsClient(clientId) : null;

  if (!client) return <AnalyticsDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} />;

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const metrics: AnalyticsMetric[] = metricConfig.map((config) => {
    const metric = metricMap.get(config.key);
    const current = metric?.values[0];
    const previous = metric?.values[1];
    return { key: config.viewKey, label: metric?.name ?? config.label, description: metric?.description ?? config.description, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, format: config.format, source: metric?.source ?? "GA4" };
  });

  const rowMap = new Map<string, AnalyticsRow>();
  for (const config of metricConfig) {
    for (const value of [...(metricMap.get(config.key)?.values ?? [])].reverse()) {
      const periodStart = new Date(value.periodStart).toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(new Date(value.periodStart)), activeUsers: null, sessions: null, organicSessions: null, views: null, engagedSessions: null, engagementRate: null, eventCount: null, keyEvents: null, phoneClicks: null, formSubmissions: null, quoteRequests: null };
      existing[config.viewKey as MetricKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  return (
    <>
      <AnalyticsDashboard clientName={client.businessName} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} />
      {access.user?.role === "SUPER_ADMIN" && <div className="content" style={{ marginTop: "1.5rem" }}><CsvImportPanel clientId={client.id} screen="analytics" /></div>}
    </>
  );
}
