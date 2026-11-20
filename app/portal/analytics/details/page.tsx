import { prisma } from "@ai-rankers/db";
import { unstable_cache } from "next/cache";
import { requirePortalService } from "../../../../lib/auth/access";
import { AnalyticsConnectionDetails } from "../../../../components/analytics-connection-details";

export const dynamic = "force-dynamic";

function getCachedAnalyticsDetails(clientId: string) {
  return unstable_cache(async () => {
    const settings = await prisma.client.findUnique({ where: { id: clientId }, select: { dataMode: true } });
    if (!settings) return null;
    return prisma.client.findUnique({
      where: { id: clientId },
      select: {
        businessName: true,
        brandMark: true,
        brandAccent: true,
        dataMode: true,
        metrics: {
          where: { source: "GA4", isVisible: true, isDraft: false },
          select: { key: true, values: { where: { dataOrigin: settings.dataMode }, orderBy: { periodStart: "desc" }, take: 12, select: { periodStart: true, periodEnd: true } } },
        },
      },
    });
  }, ["portal-analytics-details", clientId], { revalidate: 60, tags: [`portal-analytics-details:${clientId}`] })();
}

export default async function AnalyticsDetailsPage() {
  const access = await requirePortalService("analytics");
  const clientId = access.user?.clientId ?? "__no_client__";
  const client = await getCachedAnalyticsDetails(clientId);

  const metricsWithValues = client?.metrics.filter((metric) => metric.values.length > 0) ?? [];
  const reportingPeriods = new Set(metricsWithValues.flatMap((metric) => metric.values.map((value) => value.periodStart.toISOString())));
  const latestPeriod = metricsWithValues.flatMap((metric) => metric.values.map((value) => value.periodStart)).sort((left, right) => right.getTime() - left.getTime())[0];
  const trackedEventLabels = new Map([
    ["ga4-phone-clicks", "phone_click"],
    ["ga4-form-submissions", "form_submit"],
    ["ga4-quote-requests", "quote_request"],
  ]);
  const trackedEvents = metricsWithValues.map((metric) => trackedEventLabels.get(metric.key)).filter((value): value is string => Boolean(value));

  return <AnalyticsConnectionDetails
    clientName={client?.businessName ?? "Client workspace"}
    brandMark={client?.brandMark ?? "CL"}
    brandAccent={client?.brandAccent ?? "#F26B38"}
    availableMetricCount={metricsWithValues.length}
    expectedMetricCount={11}
    reportingPeriodCount={reportingPeriods.size}
    latestPeriodLabel={latestPeriod?.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" }) ?? null}
    trackedEvents={trackedEvents}
  />;
}
