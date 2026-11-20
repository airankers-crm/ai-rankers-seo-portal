import { Prisma, PrismaClient } from "@prisma/client";

type Database = PrismaClient | Prisma.TransactionClient;

export const GOOGLE_METRIC_DEFINITIONS = [
  { key: "ga4-active-users", name: "Active users", description: "Unique users who visited the website during the reporting period.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-sessions", name: "Sessions", description: "Visits recorded by Google Analytics 4.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-organic-sessions", name: "Organic sessions", description: "Sessions attributed to unpaid organic search.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "LINE_CHART" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-views", name: "Page views", description: "Pages viewed across the website.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-engaged-sessions", name: "Engaged sessions", description: "Sessions that met the GA4 engagement criteria.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-engagement-rate", name: "Engagement rate", description: "The percentage of sessions that were engaged.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "PERCENT_CARD" as const, valueFormat: "PERCENT" as const },
  { key: "ga4-event-count", name: "Event count", description: "The total number of events recorded by Google Analytics 4.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-key-events", name: "Key events", description: "Configured conversion events recorded by Google Analytics 4.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-phone-clicks", name: "Phone clicks", description: "Clicks on tracked phone links.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-form-submissions", name: "Form submissions", description: "Contact-form submissions recorded as GA4 events.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-quote-requests", name: "Quote requests", description: "Quote-request events configured as GA4 conversions.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gsc-impressions", name: "Search impressions", description: "Search result impressions recorded by Google Search Console.", source: "GSC" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gsc-clicks", name: "Search clicks", description: "Search result clicks recorded by Google Search Console.", source: "GSC" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gsc-ctr", name: "Search CTR", description: "The percentage of Search Console impressions that became clicks.", source: "GSC" as const, section: "WEBSITE" as const, displayType: "PERCENT_CARD" as const, valueFormat: "PERCENT" as const },
  { key: "gsc-position", name: "Average position", description: "The Search Console average position weighted by impressions.", source: "GSC" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "DECIMAL" as const },
  { key: "gbp-views", name: "Profile views", description: "Google Business Profile views from Search and Maps.", source: "GBP" as const, section: "GBP" as const, displayType: "LINE_CHART" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-calls", name: "GBP calls", description: "Calls attributed to the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-website-clicks", name: "Website clicks", description: "Website actions attributed to the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-directions", name: "Direction requests", description: "Direction requests from the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-reviews", name: "Reviews received", description: "New reviews received during the reporting period.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
] as const;

const SECTION_DEFAULTS = {
  OVERVIEW: { name: "Overview", position: 0 },
  WEBSITE: { name: "Website GSC", position: 1 },
  GBP: { name: "GBP Performance", position: 2 },
} as const;

const REPORTING_SECTION_KINDS = ["OVERVIEW", "WEBSITE", "GBP"] as const;
type ReportingSectionKind = (typeof REPORTING_SECTION_KINDS)[number];

type ProvisionSection = {
  id: string;
  kind: ReportingSectionKind;
  presentationId: string | null;
};

const WEBSITE_GSC_METRIC_DEFINITIONS = [
  ...GOOGLE_METRIC_DEFINITIONS.filter((definition) => ["ga4-organic-sessions", "gsc-clicks", "gsc-impressions", "gsc-ctr", "gsc-position"].includes(definition.key)),
  { key: "kw-top10", name: "Keywords in top 10", description: "Tracked keywords currently appearing within the first ten organic results.", source: "DATAFORSEO" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "RANK" as const },
] as const;

async function ensureReportingSections(database: Database, clientId: string) {
  const existing = await database.section.findMany({
    where: { clientId, kind: { in: [...REPORTING_SECTION_KINDS] } },
    select: { id: true, kind: true, presentation: { select: { id: true } } },
  });
  const sections = new Map<ReportingSectionKind, ProvisionSection>(existing.map((section) => [section.kind as ReportingSectionKind, { id: section.id, kind: section.kind as ReportingSectionKind, presentationId: section.presentation?.id ?? null }]));

  for (const kind of REPORTING_SECTION_KINDS) {
    if (sections.has(kind)) continue;
    const created = await database.section.create({
      data: { clientId, kind, ...SECTION_DEFAULTS[kind], isVisible: true, isDraft: false },
      select: { id: true },
    });
    sections.set(kind, { id: created.id, kind, presentationId: null });
  }

  return sections;
}

export async function provisionWebsiteGscMetrics(clientId: string, database?: Database) {
  database ??= (await import("@ai-rankers/db")).prisma;
  const section = (await ensureReportingSections(database, clientId)).get("WEBSITE");
  if (!section) return;

  const existingMetrics = await database.metric.findMany({
    where: { clientId, key: { in: WEBSITE_GSC_METRIC_DEFINITIONS.map((definition) => definition.key) } },
    select: { key: true, sectionId: true },
  });
  const existingByKey = new Map(existingMetrics.map((metric) => [metric.key, metric]));
  const writes = WEBSITE_GSC_METRIC_DEFINITIONS.flatMap((definition) => {
    const existing = existingByKey.get(definition.key);
    if (!existing) {
      return [database!.metric.create({
        data: { clientId, sectionId: section.id, key: definition.key, name: definition.name, description: definition.description, source: definition.source, displayType: definition.displayType, valueFormat: definition.valueFormat, isVisible: true, isDraft: false },
      })];
    }
    return definition.source === "GSC" && existing.sectionId !== section.id
      ? [database!.metric.update({ where: { clientId_key: { clientId, key: definition.key } }, data: { sectionId: section.id } })]
      : [];
  });
  await Promise.all(writes);
}

export async function provisionGoogleMetrics(clientId: string, database?: Database) {
  database ??= (await import("@ai-rankers/db")).prisma;
  const sections = await ensureReportingSections(database, clientId);

  const gbpSection = sections.get("GBP");
  if (gbpSection && !gbpSection.presentationId) await database.gbpPresentation.create({ data: { sectionId: gbpSection.id } });

  const existingMetrics = await database.metric.findMany({
    where: { clientId, key: { in: GOOGLE_METRIC_DEFINITIONS.map((definition) => definition.key) } },
    select: { key: true, sectionId: true },
  });
  const existingByKey = new Map(existingMetrics.map((metric) => [metric.key, metric]));
  const writes = GOOGLE_METRIC_DEFINITIONS.flatMap((definition) => {
    const section = sections.get(definition.section);
    const existing = existingByKey.get(definition.key);
    if (!section || existing) {
      return existing && definition.source === "GSC" && section && existing.sectionId !== section.id
        ? [database!.metric.update({ where: { clientId_key: { clientId, key: definition.key } }, data: { sectionId: section.id } })]
        : [];
    }
    return [database!.metric.create({
      data: {
        clientId,
        sectionId: section.id,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        source: definition.source,
        displayType: definition.displayType,
        valueFormat: definition.valueFormat,
        isVisible: true,
        isDraft: false,
      },
    })];
  });
  await Promise.all(writes);
}

export async function writeGoogleMetricValue(input: {
  clientId: string;
  key: string;
  periodStart: Date;
  periodEnd: Date;
  value: number;
  source: "GA4" | "GSC" | "GBP";
  note?: string | null;
}, database?: Database) {
  database ??= (await import("@ai-rankers/db")).prisma;
  const metric = await database.metric.findUnique({ where: { clientId_key: { clientId: input.clientId, key: input.key } }, select: { id: true } });
  if (!metric) return "missing_metric" as const;

  const existing = await database.metricValue.findUnique({
    where: { metricId_periodStart_periodEnd_source_dataOrigin: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source, dataOrigin: "GOOGLE_API" } },
    select: { id: true, isOverride: true },
  });
  if (existing?.isOverride) return "overridden" as const;

  await database.metricValue.upsert({
    where: { metricId_periodStart_periodEnd_source_dataOrigin: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source, dataOrigin: "GOOGLE_API" } },
    update: { value: new Prisma.Decimal(input.value), note: input.note ?? null, isOverride: false, dataOrigin: "GOOGLE_API" },
    create: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, value: new Prisma.Decimal(input.value), source: input.source, note: input.note ?? null, dataOrigin: "GOOGLE_API" },
  });
  return existing ? "updated" as const : "created" as const;
}
