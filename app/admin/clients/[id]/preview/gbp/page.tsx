import { notFound } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import { defaultGbpPresentation, GbpPerformanceDashboard, type GbpMetric, type GbpPeriodRow, type GbpPresentationSettings } from "../../../../../../components/gbp-performance-dashboard";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "gbp-calls", viewKey: "calls", label: "Call clicks", source: "GBP", description: "Calls attributed to the Google Business Profile listing." },
  { key: "gbp-views", viewKey: "views", label: "Search & Maps impressions", source: "GBP", description: "Search and Maps impressions for the listing." },
  { key: "gbp-website-clicks", viewKey: "clicks", label: "Website clicks", source: "GBP", description: "Website actions attributed to the listing." },
  { key: "gbp-directions", viewKey: "directions", label: "Direction requests", source: "GBP", description: "Requests for directions from the listing." },
  { key: "gbp-reviews", viewKey: "reviews", label: "Reviews received", source: "GBP", description: "New reviews received during the reporting period." },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function AdminGbpPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ mode?: string }> }) {
  await requireAdminAccess();
  const { id } = await params;
  const isDraftPreview = (await searchParams)?.mode === "draft";
  const client = await prisma.client.findUnique({
    where: { id },
    include: { sections: { where: { kind: "GBP" }, include: { presentation: true } }, metrics: { where: isDraftPreview ? { isVisible: true } : { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  });
  if (!client) notFound();

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const metrics: GbpMetric[] = metricConfig.map((config) => {
    const metric = metricMap.get(config.key);
    const current = metric?.values.at(-1);
    const previous = metric?.values.at(-2);
    return { key: config.viewKey, label: metric?.name ?? config.label, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, source: metric?.source ?? config.source, description: metric?.description ?? config.description };
  });

  const rowMap = new Map<string, GbpPeriodRow>();
  for (const config of metricConfig) {
    for (const value of metricMap.get(config.key)?.values ?? []) {
      const periodStart = value.periodStart.toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(value.periodStart), calls: null, views: null, clicks: null, directions: null, reviews: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  const section = client.sections[0];
  const presentation: GbpPresentationSettings = section?.presentation ? { ...defaultGbpPresentation, ...section.presentation } : defaultGbpPresentation;
  const rows = [...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
  const latestDataUpdate = client.metrics.flatMap((metric) => metric.values).reduce<Date | null>((latest, value) => !latest || value.updatedAt > latest ? value.updatedAt : latest, null);
  const hasGbpSource = client.metrics.some((metric) => metric.source === "GBP");

  return <GbpPerformanceDashboard clientName={client.businessName} presentation={presentation} isSectionPublished={isDraftPreview || Boolean(section?.isVisible && !section.isDraft)} connectionStatus={hasGbpSource && rows.length > 0 ? "connected" : "not-connected"} dataUpdatedAt={latestDataUpdate?.toISOString() ?? null} showDataUpdatedAt brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={rows} isDraftPreview={isDraftPreview} />;
}
