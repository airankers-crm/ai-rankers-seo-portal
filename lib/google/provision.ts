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
  { key: "gsc-impressions", name: "Search impressions", description: "Search result impressions recorded by Google Search Console.", source: "GSC" as const, section: "OVERVIEW" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gsc-clicks", name: "Search clicks", description: "Search result clicks recorded by Google Search Console.", source: "GSC" as const, section: "OVERVIEW" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-views", name: "Profile views", description: "Google Business Profile views from Search and Maps.", source: "GBP" as const, section: "GBP" as const, displayType: "LINE_CHART" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-calls", name: "GBP calls", description: "Calls attributed to the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-website-clicks", name: "Website clicks", description: "Website actions attributed to the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-directions", name: "Direction requests", description: "Direction requests from the Google Business Profile.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "gbp-reviews", name: "Reviews received", description: "New reviews received during the reporting period.", source: "GBP" as const, section: "GBP" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
] as const;

const SECTION_DEFAULTS = {
  OVERVIEW: { name: "Overview", position: 0 },
  WEBSITE: { name: "Website SEO", position: 1 },
  GBP: { name: "GBP Performance", position: 2 },
} as const;

export async function provisionGoogleMetrics(clientId: string, database?: Database) {
  database ??= (await import("@ai-rankers/db")).prisma;
  const sections = new Map<string, { id: string }>();
  for (const kind of ["OVERVIEW", "WEBSITE", "GBP"] as const) {
    const existing = await database.section.findFirst({ where: { clientId, kind }, select: { id: true } });
    const section = existing ?? await database.section.create({ data: { clientId, kind, ...SECTION_DEFAULTS[kind], isVisible: true, isDraft: false }, select: { id: true } });
    sections.set(kind, section);
  }

  const gbpSection = sections.get("GBP");
  if (gbpSection) await database.gbpPresentation.upsert({ where: { sectionId: gbpSection.id }, update: {}, create: { sectionId: gbpSection.id } });

  for (const definition of GOOGLE_METRIC_DEFINITIONS) {
    const section = sections.get(definition.section);
    if (!section) continue;
    await database.metric.upsert({
      where: { clientId_key: { clientId, key: definition.key } },
      update: {},
      create: {
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
    });
  }
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
    where: { metricId_periodStart_periodEnd_source: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source } },
    select: { id: true, isOverride: true },
  });
  if (existing?.isOverride) return "overridden" as const;

  await database.metricValue.upsert({
    where: { metricId_periodStart_periodEnd_source: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, source: input.source } },
    update: { value: new Prisma.Decimal(input.value), note: input.note ?? null, isOverride: false },
    create: { metricId: metric.id, periodStart: input.periodStart, periodEnd: input.periodEnd, value: new Prisma.Decimal(input.value), source: input.source, note: input.note ?? null },
  });
  return existing ? "updated" as const : "created" as const;
}
