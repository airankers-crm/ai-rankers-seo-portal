import { googleApiFetch, GoogleOAuthError } from "./oauth";

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

type RealtimeResponse = {
  rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
};

export type GoogleRealtimeList = Array<{ label: string; value: number }>;

export type GoogleRealtimeResult = {
  capturedAt: string;
  isManaged?: boolean;
  activeUsers30Minutes: number;
  activeUsers5Minutes: number;
  activeUsersPerMinute: Array<{ label: string; value: number }>;
  countries: GoogleRealtimeList;
  cities: GoogleRealtimeList;
  pages: GoogleRealtimeList;
  events: GoogleRealtimeList;
  keyEvents: GoogleRealtimeList;
  audiences: GoogleRealtimeList;
  platforms: GoogleRealtimeList;
  devices: GoogleRealtimeList;
  warnings: string[];
};

export type GoogleGa4TrendSummary = {
  activeUsers: number;
  sessions: number;
  eventCount: number;
  keyEvents: number;
  views: number;
};

export type GoogleGa4TrendPoint = GoogleGa4TrendSummary & { date: string };

export type GoogleGa4TrendResult = {
  current: { points: GoogleGa4TrendPoint[]; summary: GoogleGa4TrendSummary };
  comparison: { points: GoogleGa4TrendPoint[]; summary: GoogleGa4TrendSummary } | null;
  warnings: string[];
};

type GscResponse = {
  rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
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

function emptyGa4TrendSummary(): GoogleGa4TrendSummary {
  return { activeUsers: 0, sessions: 0, eventCount: 0, keyEvents: 0, views: 0 };
}

function trendDateKeys(window: GoogleSyncWindow) {
  const dates: string[] = [];
  for (let cursor = new Date(window.start); cursor <= window.end; cursor = new Date(cursor.getTime() + DAY_MS)) dates.push(toDateString(cursor));
  return dates;
}

function trendSummaryFromRow(row?: { metricValues?: Array<{ value?: string }> }): GoogleGa4TrendSummary {
  const values = row?.metricValues ?? [];
  return { activeUsers: numberValue(values[0]?.value), sessions: numberValue(values[1]?.value), eventCount: numberValue(values[2]?.value), keyEvents: numberValue(values[3]?.value), views: numberValue(values[4]?.value) };
}

function trendPointFromRow(row: { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }): GoogleGa4TrendPoint | null {
  const date = row.dimensionValues?.[0]?.value ?? "";
  if (date.length !== 8) return null;
  return { date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`, ...trendSummaryFromRow(row) };
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

async function runGa4RealtimeReport(accessToken: string, propertyId: string, body: Record<string, unknown>) {
  return googleApiFetch<RealtimeResponse>(`https://analyticsdata.googleapis.com/v1beta/${propertyResource(propertyId)}:runRealtimeReport`, accessToken, {
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
    metrics: ["activeUsers", "sessions", "screenPageViews", "engagedSessions", "eventCount", "keyEvents"].map((name) => ({ name })),
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
  for (const key of ["ga4-active-users", "ga4-sessions", "ga4-views", "ga4-engaged-sessions", "ga4-event-count", "ga4-key-events", "ga4-organic-sessions", "ga4-phone-clicks", "ga4-form-submissions", "ga4-quote-requests", "ga4-engagement-rate"]) bucketsByMetric.set(key, createBuckets(window));

  for (const row of base.rows ?? []) {
    const yearMonth = row.dimensionValues?.[0]?.value ?? "";
    const start = yearMonth.length === 6 ? monthStart(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(4, 6)) - 1) : null;
    const bucket = start ? bucketsByMetric.get("ga4-engagement-rate")?.get(monthKey(start)) : null;
    if (!bucket) continue;
    const values = row.metricValues ?? [];
    const keys = ["ga4-active-users", "ga4-sessions", "ga4-views", "ga4-engaged-sessions", "ga4-event-count", "ga4-key-events"];
    keys.forEach((key, index) => { const target = bucketsByMetric.get(key)?.get(monthKey(start!)); if (target) target.value = numberValue(values[index]?.value); });
    const sessions = numberValue(values[1]?.value);
    const engagementTarget = bucketsByMetric.get("ga4-engagement-rate")?.get(monthKey(start!));
    if (engagementTarget) engagementTarget.value = sessions ? numberValue(values[3]?.value) / sessions : 0;
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

async function fetchGa4TrendWindow(accessToken: string, propertyId: string, window: GoogleSyncWindow) {
  const dateRange = { startDate: toDateString(window.start), endDate: toDateString(window.end) };
  const metrics = ["activeUsers", "sessions", "eventCount", "keyEvents", "screenPageViews"].map((name) => ({ name }));
  const [daily, summary] = await Promise.all([
    runGa4Report(accessToken, propertyId, { dateRanges: [dateRange], dimensions: [{ name: "date" }], metrics, orderBys: [{ dimension: { dimensionName: "date" } }], keepEmptyRows: true, limit: 5000 }),
    runGa4Report(accessToken, propertyId, { dateRanges: [dateRange], metrics, keepEmptyRows: true }),
  ]);
  const byDate = new Map((daily.rows ?? []).map(trendPointFromRow).filter((point): point is GoogleGa4TrendPoint => Boolean(point)).map((point) => [point.date, point]));
  const zero = emptyGa4TrendSummary();
  const points = trendDateKeys(window).map((date) => ({ date, ...(byDate.get(date) ?? zero) }));
  return { points, summary: trendSummaryFromRow(summary.rows?.[0]) };
}

export async function fetchGa4Trend(accessToken: string, propertyId: string, current: GoogleSyncWindow, comparison?: GoogleSyncWindow): Promise<GoogleGa4TrendResult> {
  const [currentResult, comparisonResult] = await Promise.all([fetchGa4TrendWindow(accessToken, propertyId, current), comparison ? fetchGa4TrendWindow(accessToken, propertyId, comparison) : Promise.resolve(null)]);
  return { current: currentResult, comparison: comparisonResult, warnings: [] };
}

function listRows(response: RealtimeResponse, metricIndex = 0) {
  return (response.rows ?? []).map((row) => ({ label: row.dimensionValues?.[0]?.value || "Unknown", value: numberValue(row.metricValues?.[metricIndex]?.value) })).filter((row) => row.value > 0).sort((left, right) => right.value - left.value);
}

async function realtimeByDimension(accessToken: string, propertyId: string, dimension: string, metric: string) {
  return runGa4RealtimeReport(accessToken, propertyId, { dimensions: [{ name: dimension }], metrics: [{ name: metric }], limit: 10, orderBys: [{ metric: { metricName: metric }, desc: true }] });
}

function realtimeWarning(error: unknown) {
  if (error instanceof GoogleOAuthError) return error.message;
  return "Google Analytics could not return this realtime breakdown.";
}

async function safeRealtimeReport(accessToken: string, propertyId: string, dimension: string, metric: string) {
  try {
    return { response: await realtimeByDimension(accessToken, propertyId, dimension, metric), warning: null };
  } catch (error) {
    return { response: null, warning: realtimeWarning(error) };
  }
}

export async function fetchGa4Realtime(accessToken: string, propertyId: string): Promise<GoogleRealtimeResult> {
  const warnings: string[] = [];
  const capturedAt = new Date().toISOString();
  let summaryValues: number[] = [];
  try {
    const summary = await runGa4RealtimeReport(accessToken, propertyId, { metrics: [{ name: "activeUsers" }], minuteRanges: [{ startMinutesAgo: 29 }, { startMinutesAgo: 4 }] });
    summaryValues = (summary.rows ?? []).flatMap((row) => (row.metricValues ?? []).map((value) => numberValue(value.value)));
  } catch (error) {
    warnings.push(realtimeWarning(error));
  }

  const [perMinute, country, city, page, event, keyEvent, audience, platform, device] = await Promise.all([
    safeRealtimeReport(accessToken, propertyId, "minutesAgo", "activeUsers"),
    safeRealtimeReport(accessToken, propertyId, "country", "activeUsers"),
    safeRealtimeReport(accessToken, propertyId, "city", "activeUsers"),
    safeRealtimeReport(accessToken, propertyId, "unifiedScreenName", "screenPageViews"),
    safeRealtimeReport(accessToken, propertyId, "eventName", "eventCount"),
    safeRealtimeReport(accessToken, propertyId, "eventName", "keyEvents"),
    safeRealtimeReport(accessToken, propertyId, "audienceName", "activeUsers"),
    safeRealtimeReport(accessToken, propertyId, "platform", "activeUsers"),
    safeRealtimeReport(accessToken, propertyId, "deviceCategory", "activeUsers"),
  ]);
  for (const result of [perMinute, country, city, page, event, keyEvent, audience, platform, device]) if (result.warning) warnings.push(result.warning);
  return {
    capturedAt,
    activeUsers30Minutes: summaryValues[0] ?? 0,
    activeUsers5Minutes: summaryValues[1] ?? 0,
    activeUsersPerMinute: perMinute.response ? listRows(perMinute.response).sort((left, right) => Number(left.label) - Number(right.label)) : [],
    countries: country.response ? listRows(country.response) : [],
    cities: city.response ? listRows(city.response) : [],
    pages: page.response ? listRows(page.response) : [],
    events: event.response ? listRows(event.response) : [],
    keyEvents: keyEvent.response ? listRows(keyEvent.response) : [],
    audiences: audience.response ? listRows(audience.response) : [],
    platforms: platform.response ? listRows(platform.response) : [],
    devices: device.response ? listRows(device.response) : [],
    warnings: [...new Set(warnings)],
  };
}

export async function fetchGscMetrics(accessToken: string, siteUrl: string, window: GoogleSyncWindow): Promise<GoogleProviderResult> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await googleApiFetch<GscResponse>(url, accessToken, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ startDate: toDateString(window.start), endDate: toDateString(new Date(window.end.getTime() - DAY_MS)), dimensions: ["date"], type: "web", dataState: "final", rowLimit: 25_000 }),
  });
  const buckets = new Map([...createBuckets(window)].map(([key, bucket]) => [key, {
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    clicks: 0,
    impressions: 0,
    positionWeightedTotal: 0,
    positionWeight: 0,
  }]));
  for (const row of response.rows ?? []) {
    const date = row.keys?.[0] ? new Date(`${row.keys[0]}T00:00:00.000Z`) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const bucket = buckets.get(monthKey(date));
    if (!bucket) continue;
    const impressions = numberValue(row.impressions);
    bucket.impressions += impressions;
    bucket.clicks += numberValue(row.clicks);
    if (impressions > 0 && row.position !== undefined && Number.isFinite(row.position)) {
      bucket.positionWeightedTotal += row.position * impressions;
      bucket.positionWeight += impressions;
    }
  }
  const monthly = [...buckets.values()];
  return {
    points: [
      ...monthly.map((bucket) => ({ key: "gsc-impressions", periodStart: bucket.periodStart, periodEnd: bucket.periodEnd, value: bucket.impressions, source: "GSC" as const })),
      ...monthly.map((bucket) => ({ key: "gsc-clicks", periodStart: bucket.periodStart, periodEnd: bucket.periodEnd, value: bucket.clicks, source: "GSC" as const })),
      ...monthly.map((bucket) => ({ key: "gsc-ctr", periodStart: bucket.periodStart, periodEnd: bucket.periodEnd, value: bucket.impressions > 0 ? (bucket.clicks / bucket.impressions) * 100 : 0, source: "GSC" as const })),
      ...monthly.map((bucket) => ({ key: "gsc-position", periodStart: bucket.periodStart, periodEnd: bucket.periodEnd, value: bucket.positionWeight > 0 ? bucket.positionWeightedTotal / bucket.positionWeight : 0, source: "GSC" as const })),
    ],
    warnings: [],
  };
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
