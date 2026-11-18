import { notFound } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import { WebsiteSeoDashboard, type WebsiteSeoMetric, type WebsiteSeoRow } from "../../../../../../components/website-seo-dashboard";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "ga4-organic-sessions", viewKey: "organicTraffic", description: "Sessions attributed to organic search in the selected reporting window." },
  { key: "gsc-clicks", viewKey: "searchClicks", description: "Search result clicks recorded by Google Search Console." },
  { key: "gsc-impressions", viewKey: "impressions", description: "Search results impressions recorded by Google Search Console." },
  { key: "gsc-ctr", viewKey: "ctr", description: "The percentage of Search Console impressions that became clicks." },
  { key: "gsc-position", viewKey: "position", description: "The Search Console average position weighted by impressions." },
  { key: "kw-top10", viewKey: "topTen", description: "Tracked keywords currently appearing within the first ten organic results." },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function AdminWebsiteSeoPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ mode?: string }> }) {
  await requireAdminAccess();
  const { id } = await params;
  const isDraftPreview = (await searchParams)?.mode === "draft";
  const settings = await prisma.client.findUnique({ where: { id }, select: { dataMode: true } });
  const client = settings ? await prisma.client.findUnique({
    where: { id },
    include: { sections: { where: { kind: "WEBSITE" }, select: { name: true, isVisible: true, isDraft: true } }, metrics: { where: isDraftPreview ? { isVisible: true } : { isVisible: true, isDraft: false }, include: { values: { where: { dataOrigin: settings.dataMode }, orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  }) : null;
  if (!client) notFound();

  const metricMap = new Map(client.metrics.map((metric) => [metric.key, metric]));
  const metrics: WebsiteSeoMetric[] = metricConfig.flatMap((config) => {
    const metric = metricMap.get(config.key);
    if (!metric) return [];
    const current = metric.values.at(-1);
    const previous = metric.values.at(-2);
    const format = metric.valueFormat === "RANK" ? "RANK" : metric.valueFormat === "DURATION_SECONDS" ? "INTEGER" : metric.valueFormat;
    return [{ key: config.viewKey, label: metric.name, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, format, source: metric.source, description: metric.description ?? config.description }];
  });

  const rowMap = new Map<string, WebsiteSeoRow>();
  for (const config of metricConfig) {
    for (const value of metricMap.get(config.key)?.values ?? []) {
      const periodStart = value.periodStart.toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(value.periodStart), organicTraffic: null, searchClicks: null, impressions: null, ctr: null, position: null, topTen: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  const section = client.sections[0];
  return <WebsiteSeoDashboard clientName={client.businessName} sectionName="Website GSC" isSectionPublished={isDraftPreview || Boolean(section?.isVisible && !section.isDraft)} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} isDraftPreview={isDraftPreview} />;
}
