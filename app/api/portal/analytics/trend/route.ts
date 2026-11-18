import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../../lib/auth/access";
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

export async function GET(request: Request) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user?.clientId) return NextResponse.json({ status: "PREVIEW", data: null }, { headers: { "Cache-Control": "private, no-store" } });

  const params = new URL(request.url).searchParams;
  const current = parseWindow(params.get("start"), params.get("end"));
  const comparison = parseWindow(params.get("comparisonStart"), params.get("comparisonEnd"));
  if (!current) return NextResponse.json({ status: "INVALID_RANGE", error: "A valid date range of 366 days or less is required." }, { status: 400 });

  try {
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
