import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../lib/auth/access";
import { GbpPerformanceDashboard, type GbpMetric, type GbpPeriodRow } from "../../../components/gbp-performance-dashboard";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "gbp-calls", viewKey: "calls", label: "GBP calls", source: "GBP", description: "Calls attributed to the connected Google Business Profile source." },
  { key: "gbp-views", viewKey: "views", label: "Profile views", source: "GBP", description: "Search and Maps profile views recorded by Google Business Profile." },
  { key: "gbp-website-clicks", viewKey: "clicks", label: "Website clicks", source: "GBP", description: "Website actions attributed to the Google Business Profile listing." },
  { key: "gbp-directions", viewKey: "directions", label: "Direction requests", source: "GBP", description: "Requests for directions from the profile listing." },
  { key: "gbp-reviews", viewKey: "reviews", label: "Reviews received", source: "GBP", description: "New reviews received during the selected reporting window." },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function GbpPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    include: { metrics: { include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  });

  if (!client) return <GbpPerformanceDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} />;

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const metrics: GbpMetric[] = metricConfig.map((config) => {
    const metric = metricMap.get(config.key);
    const current = metric?.values.at(-1);
    const previous = metric?.values.at(-2);
    return { key: config.viewKey, label: config.label, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, source: metric?.source ?? config.source, description: config.description };
  });

  const rowMap = new Map<string, GbpPeriodRow>();
  for (const value of metricMap.get("gbp-calls")?.values ?? []) {
    const periodStart = value.periodStart.toISOString();
    rowMap.set(periodStart, { periodStart, periodLabel: formatPeriod(value.periodStart), calls: Number(value.value) });
  }

  return <GbpPerformanceDashboard clientName={client.businessName} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} />;
}
