import { prisma } from "@ai-rankers/db";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { requirePortalAccess } from "../../../lib/auth/access";
import { defaultGbpPresentation, GbpPerformanceDashboard, type GbpMetric, type GbpPeriodRow, type GbpPresentationSettings } from "../../../components/gbp-performance-dashboard";

export const dynamic = "force-dynamic";

function getCachedGbpClient(clientId: string) {
  return unstable_cache(() => prisma.client.findUnique({
    where: { id: clientId },
    include: { sections: { where: { kind: "GBP" }, include: { presentation: true } }, metrics: { where: { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "desc" }, take: 24 } }, orderBy: { position: "asc" } } },
  }), ["portal-gbp", clientId], { revalidate: 60, tags: [`portal-gbp:${clientId}`] })();
}

const metricConfig = [
  { key: "gbp-calls", viewKey: "calls", label: "Call clicks", source: "GBP", description: "Calls attributed to the connected Google Business Profile source." },
  { key: "gbp-views", viewKey: "views", label: "Search & Maps impressions", source: "GBP", description: "Search and Maps impressions recorded by Google Business Profile." },
  { key: "gbp-website-clicks", viewKey: "clicks", label: "Website clicks", source: "GBP", description: "Website actions attributed to the Google Business Profile listing." },
  { key: "gbp-directions", viewKey: "directions", label: "Direction requests", source: "GBP", description: "Requests for directions from the profile listing." },
  { key: "gbp-reviews", viewKey: "reviews", label: "Reviews received", source: "GBP", description: "New reviews received during the selected reporting window." },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function GbpPage({ searchParams }: { searchParams?: Promise<{ demo?: string }> }) {
  const access = await requirePortalAccess();
  const params = await searchParams;
  if (params?.demo === "1") redirect("/portal/gbp");
  const clientId = access.user?.clientId;
  const client = clientId ? await getCachedGbpClient(clientId) : null;

  if (!client) return <GbpPerformanceDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} connectionStatus="not-connected" />;

  const section = client.sections[0];
  const sectionIsPublished = Boolean(section?.isVisible && !section.isDraft);
  const presentation: GbpPresentationSettings = section?.presentation ? { ...defaultGbpPresentation, ...section.presentation } : defaultGbpPresentation;

  const metricMap = new Map((sectionIsPublished ? client.metrics : []).map((metric) => [metric.key, metric]));
  const metrics: GbpMetric[] = metricConfig.map((config) => {
    const metric = metricMap.get(config.key);
    const current = metric?.values[0];
    const previous = metric?.values[1];
    return { key: config.viewKey, label: metric?.name ?? config.label, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, source: metric?.source ?? config.source, description: metric?.description ?? config.description };
  });

  const rowMap = new Map<string, GbpPeriodRow>();
  for (const config of metricConfig) {
    for (const value of [...(metricMap.get(config.key)?.values ?? [])].reverse()) {
      const periodStartDate = new Date(value.periodStart);
      const periodStart = periodStartDate.toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(periodStartDate), calls: null, views: null, clicks: null, directions: null, reviews: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  const rows = [...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
  const hasGbpSource = client.metrics.some((metric) => metric.source === "GBP");

  return <GbpPerformanceDashboard clientName={client.businessName} presentation={presentation} isSectionPublished={sectionIsPublished} connectionStatus={hasGbpSource && rows.length > 0 ? "connected" : "not-connected"} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={rows} />;
}
