import { config as loadEnv } from "dotenv";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";

loadEnv({ path: ".env.local" });

const periods = [
  { start: new Date("2026-06-01T00:00:00.000Z"), end: new Date("2026-06-30T23:59:59.999Z") },
  { start: new Date("2026-07-01T00:00:00.000Z"), end: new Date("2026-07-31T23:59:59.999Z") },
  { start: new Date("2026-08-01T00:00:00.000Z"), end: new Date("2026-08-31T23:59:59.999Z") },
  { start: new Date("2026-09-01T00:00:00.000Z"), end: new Date("2026-09-30T23:59:59.999Z") },
  { start: new Date("2026-10-01T00:00:00.000Z"), end: new Date("2026-10-31T23:59:59.999Z") },
  { start: new Date("2026-11-01T00:00:00.000Z"), end: new Date("2026-11-30T23:59:59.999Z") },
];

async function main() {
  const client = await prisma.client.upsert({
    where: { slug: "tony-roofing" },
    update: { businessName: "Tony Roofing", status: "ACTIVE", brandMark: "TR", brandAccent: "#F26B38", hasWebsiteSeo: true, hasGbpSeo: true },
    create: {
      businessName: "Tony Roofing",
      slug: "tony-roofing",
      brandMark: "TR",
      brandAccent: "#F26B38",
      websiteUrl: "https://tonyroofing.example.com",
      contactEmail: "tony.roofing.demo@theairankers.com",
      hasWebsiteSeo: true,
      hasGbpSeo: true,
      status: "ACTIVE",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@airankers.local" },
    update: { name: "John Smith", role: "SUPER_ADMIN", status: "ACTIVE" },
    create: { email: "admin@airankers.local", name: "John Smith", role: "SUPER_ADMIN", status: "ACTIVE", allClients: true },
  });

  await prisma.user.upsert({
    where: { email: "tony.roofing.demo@theairankers.com" },
    update: { name: "Tony Roofing", role: "CLIENT", status: "ACTIVE", clientId: client.id },
    create: { email: "tony.roofing.demo@theairankers.com", name: "Tony Roofing", role: "CLIENT", status: "ACTIVE", clientId: client.id },
  });

  const supportGroup = await prisma.chatGroup.upsert({
    where: { clientId_name: { clientId: client.id, name: "SEO delivery" } },
    update: { description: "Reports, tasks, approvals, and delivery decisions for the client workspace.", isArchived: false, createdById: admin.id },
    create: { id: `${client.id}-seo-delivery`, clientId: client.id, name: "SEO delivery", description: "Reports, tasks, approvals, and delivery decisions for the client workspace.", createdById: admin.id },
  });
  const existingChatMessages = await prisma.chatMessage.count({ where: { groupId: supportGroup.id } });
  if (existingChatMessages === 0) {
    await prisma.chatMessage.createMany({ data: [
      { groupId: supportGroup.id, senderId: admin.id, body: "Welcome to the SEO delivery group. We will share report decisions, approvals, and next steps here." },
      { groupId: supportGroup.id, senderId: admin.id, body: "The first presentation dataset is ready for review. Reply here with any requested changes for the support team." },
    ] });
  }

  const overview = await prisma.section.upsert({
    where: { id: `${client.id}-overview` },
    update: { name: "Overview", isVisible: true, isDraft: false },
    create: { id: `${client.id}-overview`, clientId: client.id, name: "Overview", kind: "OVERVIEW", position: 0, isVisible: true, isDraft: false },
  });

  const website = await prisma.section.upsert({
    where: { id: `${client.id}-website` },
    update: { name: "Website SEO", isVisible: true, isDraft: false },
    create: { id: `${client.id}-website`, clientId: client.id, name: "Website SEO", kind: "WEBSITE", position: 1, isVisible: true, isDraft: false },
  });

  const gbp = await prisma.section.upsert({
    where: { id: `${client.id}-gbp` },
    update: { name: "GBP Performance", isVisible: true, isDraft: false },
    create: { id: `${client.id}-gbp`, clientId: client.id, name: "GBP Performance", kind: "GBP", position: 2, isVisible: true, isDraft: false },
  });

  await prisma.gbpPresentation.upsert({
    where: { sectionId: gbp.id },
    update: {},
    create: { sectionId: gbp.id },
  });

  const metrics = [
    { key: "ga4-organic-sessions", name: "Organic traffic", description: "Sessions attributed to organic search in the selected reporting window.", sectionId: website.id, source: "GA4" as const, values: [5120, 5940, 6380, 7010, 7118, 8426] },
    { key: "gsc-impressions", name: "Search impressions", description: "Search results impressions recorded by Google Search Console.", sectionId: overview.id, source: "GSC" as const, values: [80000, 90000, 96000, 102000, 100000, 124800] },
    { key: "kw-top10", name: "Keywords in top 10", description: "Tracked keywords currently appearing within the first ten organic results.", sectionId: website.id, source: "DATAFORSEO" as const, values: [42, 46, 51, 56, 60, 68] },
    { key: "gbp-calls", name: "GBP calls generated", description: "Calls attributed to the connected Google Business Profile source.", sectionId: gbp.id, source: "GBP" as const, values: [81, 88, 94, 107, 130, 142] },
  ];

  for (const [index, definition] of metrics.entries()) {
    const metric = await prisma.metric.upsert({
      where: { clientId_key: { clientId: client.id, key: definition.key } },
      update: { name: definition.name, description: definition.description, sectionId: definition.sectionId, source: definition.source, isVisible: true, isDraft: false, position: index },
      create: { clientId: client.id, sectionId: definition.sectionId, key: definition.key, name: definition.name, description: definition.description, source: definition.source, displayType: definition.key === "ga4-organic-sessions" ? "LINE_CHART" : "NUMBER_CARD", isVisible: true, isDraft: false, position: index },
    });

    for (const [valueIndex, value] of definition.values.entries()) {
      const period = periods[valueIndex];
      await prisma.metricValue.upsert({
        where: { metricId_periodStart_periodEnd_source: { metricId: metric.id, periodStart: period.start, periodEnd: period.end, source: definition.source } },
        update: { value: new Prisma.Decimal(value) },
        create: { metricId: metric.id, periodStart: period.start, periodEnd: period.end, value: new Prisma.Decimal(value), source: definition.source },
      });
    }
  }

  const organicMetric = await prisma.metric.findUnique({ where: { clientId_key: { clientId: client.id, key: "ga4-organic-sessions" } } });
  const keywordMetric = await prisma.metric.findUnique({ where: { clientId_key: { clientId: client.id, key: "kw-top10" } } });
  const organicGoal = await prisma.goal.upsert({
    where: { id: `${client.id}-goal-organic-traffic` },
    update: { name: "Grow organic traffic", description: "Build qualified search visibility through the current website SEO workstream.", metricId: organicMetric?.id, target: new Prisma.Decimal(9000), startDate: new Date("2026-11-01T00:00:00.000Z"), endDate: new Date("2026-12-31T23:59:59.999Z"), status: "ACTIVE", isVisible: true },
    create: { id: `${client.id}-goal-organic-traffic`, clientId: client.id, createdById: admin.id, name: "Grow organic traffic", description: "Build qualified search visibility through the current website SEO workstream.", metricId: organicMetric?.id, condition: "GREATER_THAN_OR_EQUAL", target: new Prisma.Decimal(9000), startDate: new Date("2026-11-01T00:00:00.000Z"), endDate: new Date("2026-12-31T23:59:59.999Z"), status: "ACTIVE", isVisible: true },
  });
  const keywordGoal = await prisma.goal.upsert({
    where: { id: `${client.id}-goal-top-ten` },
    update: { name: "Expand top-10 keyword coverage", description: "Increase the number of priority terms reaching the first page of search results.", metricId: keywordMetric?.id, target: new Prisma.Decimal(75), startDate: new Date("2026-11-01T00:00:00.000Z"), endDate: new Date("2026-12-31T23:59:59.999Z"), status: "ACTIVE", isVisible: true },
    create: { id: `${client.id}-goal-top-ten`, clientId: client.id, createdById: admin.id, name: "Expand top-10 keyword coverage", description: "Increase the number of priority terms reaching the first page of search results.", metricId: keywordMetric?.id, condition: "GREATER_THAN_OR_EQUAL", target: new Prisma.Decimal(75), startDate: new Date("2026-11-01T00:00:00.000Z"), endDate: new Date("2026-12-31T23:59:59.999Z"), status: "ACTIVE", isVisible: true },
  });
  await prisma.goalAnnotation.upsert({
    where: { id: `${client.id}-goal-milestone-pages` },
    update: { goalId: organicGoal.id, createdById: admin.id, title: "Service page optimization milestone", body: "Core service pages were optimized and published.", happenedAt: new Date("2026-11-04T12:00:00.000Z"), isVisible: true },
    create: { id: `${client.id}-goal-milestone-pages`, goalId: organicGoal.id, createdById: admin.id, title: "Service page optimization milestone", body: "Core service pages were optimized and published.", happenedAt: new Date("2026-11-04T12:00:00.000Z"), isVisible: true },
  });
  await prisma.goalAnnotation.upsert({
    where: { id: `${client.id}-goal-milestone-keywords` },
    update: { goalId: keywordGoal.id, createdById: admin.id, title: "Keyword visibility milestone", body: "The program reached 68 top-10 keywords this period, moving closer to the 75-term target.", happenedAt: new Date("2026-11-01T12:00:00.000Z"), isVisible: true },
    create: { id: `${client.id}-goal-milestone-keywords`, goalId: keywordGoal.id, createdById: admin.id, title: "Keyword visibility milestone", body: "The program reached 68 top-10 keywords this period, moving closer to the 75-term target.", happenedAt: new Date("2026-11-01T12:00:00.000Z"), isVisible: true },
  });

  await prisma.activity.deleteMany({ where: { clientId: client.id } });
  await prisma.activity.createMany({ data: [
    { clientId: client.id, title: "Service pages optimized", category: "Website SEO", status: "COMPLETED", completedAt: new Date("2026-11-04T12:00:00.000Z") },
    { clientId: client.id, title: "Review response workflow prepared", category: "GBP SEO", status: "IN_PROGRESS" },
    { clientId: client.id, title: "Internal linking pass completed", category: "Website SEO", status: "COMPLETED", completedAt: new Date("2026-10-30T12:00:00.000Z") },
  ] });

  await prisma.report.deleteMany({ where: { clientId: client.id } });
  await prisma.report.createMany({ data: [
    { clientId: client.id, title: "October SEO performance report", type: "Monthly SEO", periodLabel: "October 2026", isVisible: true },
    { clientId: client.id, title: "Local visibility snapshot", type: "GBP ranking", periodLabel: "October 2026", isVisible: true },
    { clientId: client.id, title: "Technical cleanup summary", type: "Website audit", periodLabel: "Q4 2026", isVisible: true },
  ] });

  console.log(`Seeded ${client.businessName} (${client.id})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
