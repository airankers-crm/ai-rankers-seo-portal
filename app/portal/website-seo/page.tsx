import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../lib/auth/access";
import { WebsiteSeoDashboard, type WebsiteSeoMetric, type WebsiteSeoRow } from "../../../components/website-seo-dashboard";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "ga4-organic-sessions", viewKey: "organicTraffic", description: "Sessions attributed to organic search in the selected reporting window." },
  { key: "gsc-impressions", viewKey: "impressions", description: "Search results impressions recorded by Google Search Console." },
  { key: "kw-top10", viewKey: "topTen", description: "Tracked keywords currently appearing within the first ten organic results." },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function WebsiteSeoPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    include: { metrics: { where: { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  });

  if (!client) return <WebsiteSeoDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} />;

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const metrics: WebsiteSeoMetric[] = metricConfig.flatMap((config) => {
    const metric = metricMap.get(config.key);
    if (!metric) return [];
    const current = metric.values.at(-1);
    const previous = metric.values.at(-2);
    const format = metric.valueFormat === "RANK" ? "RANK" : metric.valueFormat === "DURATION_SECONDS" ? "INTEGER" : metric.valueFormat;
    return [{ key: config.viewKey, label: metric.name, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, format, source: metric.source, description: config.description }];
  });

  const rowMap = new Map<string, WebsiteSeoRow>();
  for (const config of metricConfig) {
    const metric = metricMap.get(config.key);
    for (const value of metric?.values ?? []) {
      const periodStart = value.periodStart.toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(value.periodStart), organicTraffic: null, impressions: null, topTen: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  return <WebsiteSeoDashboard clientName={client.businessName} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} />;
}
