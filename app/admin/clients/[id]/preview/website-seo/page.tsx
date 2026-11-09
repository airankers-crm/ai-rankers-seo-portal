import { notFound } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import { WebsiteSeoDashboard, type WebsiteSeoChannel, type WebsiteSeoMetric, type WebsiteSeoRow } from "../../../../../../components/website-seo-dashboard";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const metricConfig = [
  { key: "ga4-organic-sessions", viewKey: "organicTraffic", description: "Sessions attributed to organic search in the selected reporting window." },
  { key: "gsc-impressions", viewKey: "impressions", description: "Search results impressions recorded by Google Search Console." },
  { key: "kw-top10", viewKey: "topTen", description: "Tracked keywords currently appearing within the first ten organic results." },
] as const;

const channelConfig = [
  { key: "ga4-channel-organic", label: "Organic search", color: "#F26B38" },
  { key: "ga4-channel-direct", label: "Direct", color: "#12243F" },
  { key: "ga4-channel-referral", label: "Referral", color: "#148F83" },
  { key: "ga4-channel-email", label: "Email", color: "#6F3FB5" },
  { key: "ga4-channel-paid-social", label: "Paid social", color: "#8E98A8" },
] as const;

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

export default async function AdminWebsiteSeoPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ mode?: string }> }) {
  await requireAdminAccess();
  const { id } = await params;
  const isDraftPreview = (await searchParams)?.mode === "draft";
  const client = await prisma.client.findUnique({
    where: { id },
    include: { sections: { where: { kind: "WEBSITE" }, select: { name: true, isVisible: true, isDraft: true } }, metrics: { where: isDraftPreview ? { isVisible: true } : { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  });
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
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(value.periodStart), organicTraffic: null, impressions: null, topTen: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  const latestChannelValues = channelConfig.map((config) => ({ config, metric: metricMap.get(config.key) })).map(({ config, metric }) => ({ config, value: metric?.values.at(-1) ? Number(metric.values.at(-1)!.value) : null }));
  const channels: WebsiteSeoChannel[] | undefined = latestChannelValues.every(({ value }) => value !== null)
    ? latestChannelValues.map(({ config, value }) => ({ key: config.key, label: config.label, color: config.color, value: value as number }))
    : undefined;

  const section = client.sections[0];
  const latestDataUpdate = client.metrics.flatMap((metric) => metric.values).reduce<Date | null>((latest, value) => !latest || value.updatedAt > latest ? value.updatedAt : latest, null);
  return <WebsiteSeoDashboard clientName={client.businessName} sectionName={section?.name ?? "Website SEO"} isSectionPublished={isDraftPreview || Boolean(section?.isVisible && !section.isDraft)} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} channels={channels} dataUpdatedAt={latestDataUpdate?.toISOString() ?? null} isDraftPreview={isDraftPreview} />;
}
