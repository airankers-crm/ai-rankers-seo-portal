import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalService } from "../../../../../lib/auth/access";
import { GoogleOAuthError } from "../../../../../lib/google/oauth";
import { fetchGa4Trend, type GoogleSyncWindow } from "../../../../../lib/google/reporting";
import { getGoogleAccessToken } from "../../../../../lib/google/tokens";

export const dynamic = "force-dynamic";

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseWindow(startValue: string | null, endValue: string | null): GoogleSyncWindow | null {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end || start > end) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days > 366 ? null : { start, end };
}

type ManagedTrendPoint = { date: string; activeUsers: number; sessions: number; eventCount: number; keyEvents: number; views: number };
type ManagedTrend = { points: ManagedTrendPoint[]; summary: Omit<ManagedTrendPoint, "date"> };

async function readManagedTrend(clientId: string, window: GoogleSyncWindow): Promise<ManagedTrend> {
  const values = await prisma.metricValue.findMany({
    where: { dataOrigin: "MANAGED", periodStart: { gte: window.start }, periodEnd: { lte: window.end }, metric: { clientId, source: "GA4" } },
    select: { periodStart: true, value: true, metric: { select: { key: true } } },
    orderBy: { periodStart: "asc" },
  });
  const rows = new Map<string, ManagedTrendPoint>();
  for (const value of values) {
    const date = value.periodStart.toISOString().slice(0, 10);
    const row = rows.get(date) ?? { date, activeUsers: 0, sessions: 0, eventCount: 0, keyEvents: 0, views: 0 };
    const numeric = Number(value.value);
    if (value.metric.key === "ga4-active-users") row.activeUsers = numeric;
    if (value.metric.key === "ga4-sessions") row.sessions = numeric;
    if (value.metric.key === "ga4-event-count") row.eventCount = numeric;
    if (value.metric.key === "ga4-key-events") row.keyEvents = numeric;
    if (value.metric.key === "ga4-views") row.views = numeric;
    rows.set(date, row);
  }
  const points = [...rows.values()];
  const summary = points.reduce((total, point) => ({
    activeUsers: point.activeUsers,
    sessions: total.sessions + point.sessions,
    eventCount: total.eventCount + point.eventCount,
    keyEvents: total.keyEvents + point.keyEvents,
    views: total.views + point.views,
  }), { activeUsers: 0, sessions: 0, eventCount: 0, keyEvents: 0, views: 0 });
  return { points, summary };
}

export async function GET(request: Request) {
  const access = await requirePortalService("analytics");
  if (access.preview || !access.user?.clientId) return NextResponse.json({ status: "PREVIEW", data: null }, { headers: { "Cache-Control": "private, no-store" } });

  const params = new URL(request.url).searchParams;
  const current = parseWindow(params.get("start"), params.get("end"));
  const comparison = parseWindow(params.get("comparisonStart"), params.get("comparisonEnd"));
  if (!current) return NextResponse.json({ status: "INVALID_RANGE", error: "A valid date range of 366 days or less is required." }, { status: 400 });

  try {
    const client = await prisma.client.findUnique({ where: { id: access.user.clientId }, select: { dataMode: true } });
    if (client?.dataMode === "MANAGED") {
      const [currentData, comparisonData] = await Promise.all([readManagedTrend(access.user.clientId, current), comparison ? readManagedTrend(access.user.clientId, comparison) : Promise.resolve(null)]);
      return NextResponse.json({ status: "READY", data: { current: currentData, comparison: comparisonData, warnings: ["Showing managed DB data. Switch the client portal data source to Google API data for live provider trend queries."] } }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const integration = await prisma.googleIntegration.findUnique({ where: { clientId: access.user.clientId }, select: { status: true, ga4PropertyId: true } });
    if (integration?.status !== "CONNECTED" || !integration.ga4PropertyId) return NextResponse.json({ status: "NOT_CONNECTED", data: null }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    const { accessToken } = await getGoogleAccessToken(access.user.clientId);
    const data = await fetchGa4Trend(accessToken, integration.ga4PropertyId, current, comparison ?? undefined);
    return NextResponse.json({ status: "READY", data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof GoogleOAuthError ? error.status : 502;
    const code = error instanceof GoogleOAuthError ? error.code : "GA4_TREND_FAILED";
    return NextResponse.json({ status: "ERROR", code, error: "Google Analytics trend data is temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
