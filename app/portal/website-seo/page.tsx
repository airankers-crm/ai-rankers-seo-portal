import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../lib/auth/access";
import { WebsiteSeoDashboard, type WebsiteSeoChannel, type WebsiteSeoMetric, type WebsiteSeoRow } from "../../../components/website-seo-dashboard";

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

export default async function WebsiteSeoPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "tony-roofing" },
    include: { sections: { where: { kind: "WEBSITE" }, select: { name: true, isVisible: true, isDraft: true } }, metrics: { where: { isVisible: true, isDraft: false }, include: { values: { orderBy: { periodStart: "asc" } } }, orderBy: { position: "asc" } } },
  });

  if (!client) return <WebsiteSeoDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} />;

  const section = client.sections[0];
  const sectionIsPublished = Boolean(section?.isVisible && !section.isDraft);

  const metricMap = new Map((sectionIsPublished ? client.metrics : []).map((metric) => [metric.key, metric]));
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
    const metric = metricMap.get(config.key);
    for (const value of metric?.values ?? []) {
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

  const latestDataUpdate = client.metrics.flatMap((metric) => metric.values).reduce<Date | null>((latest, value) => !latest || value.updatedAt > latest ? value.updatedAt : latest, null);
  return <WebsiteSeoDashboard clientName={client.businessName} sectionName={section?.name ?? "Website SEO"} isSectionPublished={sectionIsPublished} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} channels={channels} dataUpdatedAt={latestDataUpdate?.toISOString() ?? null} />;
}
