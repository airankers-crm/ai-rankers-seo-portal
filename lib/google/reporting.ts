import { googleApiFetch } from "./oauth";

export type GoogleSource = "GA4" | "GSC" | "GBP";

export type GoogleMetricPoint = {
  key: string;
  periodStart: Date;
  periodEnd: Date;
  value: number;
  source: GoogleSource;
};

export type GoogleProviderResult = {
  points: GoogleMetricPoint[];
  warnings: string[];
};

export type GoogleSyncWindow = {
  start: Date;
  end: Date;
};

type ReportResponse = {
  rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
};

type GscResponse = {
  rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number }>;
};

type GbpResponse = {
  multiDailyMetricTimeSeries?: Array<{
    dailyMetric?: string;
    timeSeries?: { datedValues?: Array<{ date?: { year?: number; month?: number; day?: number }; value?: string }> };
  }>;
};

type ReviewsResponse = {
  reviews?: Array<{ createTime?: string }>;
  nextPageToken?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const GBP_DAILY_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_DIRECTION_REQUESTS",
] as const;

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1));
}

function monthEnd(start: Date) {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createBuckets(window: GoogleSyncWindow) {
  const buckets = new Map<string, { periodStart: Date; periodEnd: Date; value: number }>();
  for (let cursor = monthStart(window.start.getUTCFullYear(), window.start.getUTCMonth()); cursor < window.end; cursor = monthStart(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1)) {
    buckets.set(monthKey(cursor), { periodStart: cursor, periodEnd: monthEnd(cursor), value: 0 });
  }
  return buckets;
}

function toPoints(buckets: Map<string, { periodStart: Date; periodEnd: Date; value: number }>, key: string, source: GoogleSource) {
  return [...buckets.values()].map((bucket) => ({ key, periodStart: bucket.periodStart, periodEnd: bucket.periodEnd, value: bucket.value, source }));
}

function numberValue(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function propertyResource(propertyId: string) {
  return propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;
}

async function runGa4Report(accessToken: string, propertyId: string, body: Record<string, unknown>) {
  return googleApiFetch<ReportResponse>(`https://analyticsdata.googleapis.com/v1beta/${propertyResource(propertyId)}:runReport`, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ga4Filter(fieldName: string, value: string): Record<string, unknown> {
  return { filter: { fieldName, stringFilter: { matchType: "EXACT", value } } };
}

export function getGoogleSyncWindow(now = new Date()): GoogleSyncWindow {
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return { start: monthStart(yesterday.getUTCFullYear(), yesterday.getUTCMonth() - 11), end: new Date(yesterday.getTime() + DAY_MS) };
}

export async function fetchGa4Metrics(accessToken: string, propertyId: string, window: GoogleSyncWindow): Promise<GoogleProviderResult> {
  const dateRange = { startDate: toDateString(window.start), endDate: toDateString(new Date(window.end.getTime() - DAY_MS)) };
  const base = await runGa4Report(accessToken, propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: "yearMonth" }],
    metrics: ["activeUsers", "sessions", "screenPageViews", "engagedSessions", "keyEvents"].map((name) => ({ name })),
    keepEmptyRows: true,
  });
  const organic = await runGa4Report(accessToken, propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: "yearMonth" }, { name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    dimensionFilter: ga4Filter("sessionDefaultChannelGroup", "Organic Search"),
    keepEmptyRows: true,
  });
  const events = await runGa4Report(accessToken, propertyId, {
    dateRanges: [dateRange],
    dimensions: [{ name: "yearMonth" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { orGroup: { expressions: ["phone_click", "form_submit", "quote_request"].map((value) => ga4Filter("eventName", value)) } },
    keepEmptyRows: true,
  });

  const bucketsByMetric = new Map<string, ReturnType<typeof createBuckets>>();
  for (const key of ["ga4-active-users", "ga4-sessions", "ga4-views", "ga4-engaged-sessions", "ga4-key-events", "ga4-organic-sessions", "ga4-phone-clicks", "ga4-form-submissions", "ga4-quote-requests"]) bucketsByMetric.set(key, createBuckets(window));
  const engagementByMonth = createBuckets(window);

  for (const row of base.rows ?? []) {
    const yearMonth = row.dimensionValues?.[0]?.value ?? "";
    const start = yearMonth.length === 6 ? monthStart(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(4, 6)) - 1) : null;
    const bucket = start ? engagementByMonth.get(monthKey(start)) : null;
    if (!bucket) continue;
    const values = row.metricValues ?? [];
    const keys = ["ga4-active-users", "ga4-sessions", "ga4-views", "ga4-engaged-sessions", "ga4-key-events"];
    keys.forEach((key, index) => { const target = bucketsByMetric.get(key)?.get(monthKey(start!)); if (target) target.value = numberValue(values[index]?.value); });
    const sessions = numberValue(values[1]?.value);
    bucket.value = sessions ? numberValue(values[3]?.value) / sessions : 0;
  }

  for (const row of organic.rows ?? []) {
    const yearMonth = row.dimensionValues?.[0]?.value ?? "";
    const start = yearMonth.length === 6 ? monthStart(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(4, 6)) - 1) : null;
    const target = start ? bucketsByMetric.get("ga4-organic-sessions")?.get(monthKey(start)) : null;
    if (target) target.value += numberValue(row.metricValues?.[0]?.value);
  }

  const eventKey: Record<string, string> = { phone_click: "ga4-phone-clicks", form_submit: "ga4-form-submissions", quote_request: "ga4-quote-requests" };
  for (const row of events.rows ?? []) {
    const startValue = row.dimensionValues?.[0]?.value ?? "";
    const key = eventKey[row.dimensionValues?.[1]?.value ?? ""];
    const start = startValue.length === 6 ? monthStart(Number(startValue.slice(0, 4)), Number(startValue.slice(4, 6)) - 1) : null;
    const target = key && start ? bucketsByMetric.get(key)?.get(monthKey(start)) : null;
    if (target) target.value += numberValue(row.metricValues?.[0]?.value);
  }

  return {
    points: [...bucketsByMetric.entries()].flatMap(([key, buckets]) => toPoints(buckets, key, "GA4")),
    warnings: [],
  };
}

export async function fetchGscMetrics(accessToken: string, siteUrl: string, window: GoogleSyncWindow): Promise<GoogleProviderResult> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await googleApiFetch<GscResponse>(url, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startDate: toDateString(window.start), endDate: toDateString(new Date(window.end.getTime() - DAY_MS)), dimensions: ["date"], type: "web", dataState: "final", rowLimit: 25_000 }),
  });
  const impressions = createBuckets(window);
  const clicks = createBuckets(window);
  for (const row of response.rows ?? []) {
    const date = row.keys?.[0] ? new Date(`${row.keys[0]}T00:00:00.000Z`) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    impressions.get(monthKey(date))!.value += numberValue(row.impressions);
    clicks.get(monthKey(date))!.value += numberValue(row.clicks);
  }
  return { points: [...toPoints(impressions, "gsc-impressions", "GSC"), ...toPoints(clicks, "gsc-clicks", "GSC")], warnings: [] };
}

function gbpDateParts(date: Date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

async function fetchGbpReviews(accessToken: string, accountId: string, locationId: string, window: GoogleSyncWindow) {
  const counts = createBuckets(window);
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${accountId}/${locationId}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await googleApiFetch<ReviewsResponse>(url.toString(), accessToken);
    for (const review of response.reviews ?? []) {
      const created = review.createTime ? new Date(review.createTime) : null;
      if (created && created >= window.start && created < window.end) counts.get(monthKey(created))!.value += 1;
    }
    pageToken = response.nextPageToken;
    if (!pageToken) break;
  }
  return counts;
}

export async function fetchGbpMetrics(accessToken: string, accountId: string, locationId: string, window: GoogleSyncWindow): Promise<GoogleProviderResult> {
  const url = new URL(`https://businessprofileperformance.googleapis.com/v1/${locationId}:fetchMultiDailyMetricsTimeSeries`);
  for (const metric of GBP_DAILY_METRICS) url.searchParams.append("dailyMetrics", metric);
  const start = gbpDateParts(window.start);
  const end = gbpDateParts(new Date(window.end.getTime() - DAY_MS));
  url.searchParams.set("dailyRange.start_date.year", String(start.year));
  url.searchParams.set("dailyRange.start_date.month", String(start.month));
  url.searchParams.set("dailyRange.start_date.day", String(start.day));
  url.searchParams.set("dailyRange.end_date.year", String(end.year));
  url.searchParams.set("dailyRange.end_date.month", String(end.month));
  url.searchParams.set("dailyRange.end_date.day", String(end.day));
  const response = await googleApiFetch<GbpResponse>(url.toString(), accessToken);
  const buckets = new Map<string, ReturnType<typeof createBuckets>>();
  for (const key of ["gbp-views", "gbp-calls", "gbp-website-clicks", "gbp-directions"]) buckets.set(key, createBuckets(window));
  const mapping: Record<string, string> = {
    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "gbp-views",
    BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "gbp-views",
    BUSINESS_IMPRESSIONS_MOBILE_MAPS: "gbp-views",
    BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "gbp-views",
    CALL_CLICKS: "gbp-calls",
    WEBSITE_CLICKS: "gbp-website-clicks",
    BUSINESS_DIRECTION_REQUESTS: "gbp-directions",
  };
  for (const series of response.multiDailyMetricTimeSeries ?? []) {
    const key = mapping[series.dailyMetric ?? ""];
    if (!key) continue;
    for (const point of series.timeSeries?.datedValues ?? []) {
      const date = point.date?.year && point.date.month && point.date.day ? new Date(Date.UTC(point.date.year, point.date.month - 1, point.date.day)) : null;
      const target = date ? buckets.get(key)?.get(monthKey(date)) : null;
      if (target) target.value += numberValue(point.value);
    }
  }
  const warnings: string[] = [];
  try {
    const reviews = await fetchGbpReviews(accessToken, accountId, locationId, window);
    buckets.set("gbp-reviews", reviews);
  } catch {
    warnings.push("GBP reviews could not be loaded; performance metrics were still synced.");
  }
  const points = [...buckets.entries()].flatMap(([key, values]) => toPoints(values, key, "GBP"));
  return { points, warnings };
}
