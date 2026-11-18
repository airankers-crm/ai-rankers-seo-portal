import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../lib/auth/access";
import { WebsiteSeoDashboard, type WebsiteSeoMetric, type WebsiteSeoRow } from "../../../components/website-seo-dashboard";
import { CsvImportPanel } from "../../../components/csv-import-panel";

export const dynamic = "force-dynamic";

function getWebsiteSeoClient(clientId: string) {
  return prisma.client.findUnique({ where: { id: clientId }, select: { dataMode: true } }).then(async (settings) => settings ? prisma.client.findUnique({
    where: { id: clientId },
    include: { sections: { where: { kind: "WEBSITE" }, select: { name: true, isVisible: true, isDraft: true } }, metrics: { where: { isVisible: true, isDraft: false }, include: { values: { where: { dataOrigin: settings.dataMode }, orderBy: { periodStart: "desc" }, take: 24 } }, orderBy: { position: "asc" } } },
  }) : null);
}

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

export default async function WebsiteSeoPage() {
  const access = await requirePortalAccess();
  const clientId = access.user?.clientId;
  const client = clientId ? await getWebsiteSeoClient(clientId) : null;

  if (!client) return <WebsiteSeoDashboard clientName="Client workspace" brandMark="CL" brandAccent="#F26B38" metrics={[]} rows={[]} />;

  const section = client.sections[0];
  const sectionIsPublished = Boolean(section?.isVisible && !section.isDraft);

  const metricMap = new Map((sectionIsPublished ? client.metrics : []).map((metric) => [metric.key, metric]));
  const metrics: WebsiteSeoMetric[] = metricConfig.flatMap((config) => {
    const metric = metricMap.get(config.key);
    if (!metric) return [];
    const current = metric.values[0];
    const previous = metric.values[1];
    const format = metric.valueFormat === "RANK" ? "RANK" : metric.valueFormat === "DURATION_SECONDS" ? "INTEGER" : metric.valueFormat;
    return [{ key: config.viewKey, label: metric.name, value: current ? Number(current.value) : null, previousValue: previous ? Number(previous.value) : null, format, source: metric.source, description: metric.description ?? config.description }];
  });

  const rowMap = new Map<string, WebsiteSeoRow>();
  for (const config of metricConfig) {
    const metric = metricMap.get(config.key);
    for (const value of [...(metric?.values ?? [])].reverse()) {
      const periodStartDate = new Date(value.periodStart);
      const periodStart = periodStartDate.toISOString();
      const existing = rowMap.get(periodStart) ?? { periodStart, periodLabel: formatPeriod(periodStartDate), organicTraffic: null, searchClicks: null, impressions: null, ctr: null, position: null, topTen: null };
      existing[config.viewKey] = Number(value.value);
      rowMap.set(periodStart, existing);
    }
  }

  const isSuperAdmin = access.user?.role === "SUPER_ADMIN";

  return (
    <>
      <WebsiteSeoDashboard clientName={client.businessName} sectionName="Website GSC" isSectionPublished={sectionIsPublished} brandMark={client.brandMark ?? client.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()} brandAccent={client.brandAccent} metrics={metrics} rows={[...rowMap.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart))} />
      {isSuperAdmin && <div className="content" style={{ marginTop: "1.5rem" }}><CsvImportPanel clientId={client.id} /></div>}
    </>
  );
}
