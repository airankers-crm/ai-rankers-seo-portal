import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalService } from "../../../../../lib/auth/access";
import { GoogleOAuthError } from "../../../../../lib/google/oauth";
import { fetchGa4Realtime, type GoogleRealtimeResult } from "../../../../../lib/google/reporting";
import { getGoogleAccessToken } from "../../../../../lib/google/tokens";

export const dynamic = "force-dynamic";

function managedRealtimeData(): GoogleRealtimeResult {
  return {
    capturedAt: new Date().toISOString(),
    isManaged: true,
    activeUsers30Minutes: 23,
    activeUsers5Minutes: 7,
    activeUsersPerMinute: [
      { label: "17", value: 3 }, { label: "16", value: 4 }, { label: "15", value: 2 }, { label: "14", value: 5 },
      { label: "13", value: 4 }, { label: "12", value: 6 }, { label: "11", value: 5 }, { label: "10", value: 4 },
      { label: "9", value: 7 }, { label: "8", value: 5 }, { label: "7", value: 6 }, { label: "6", value: 4 },
      { label: "5", value: 7 }, { label: "4", value: 6 }, { label: "3", value: 5 }, { label: "2", value: 6 },
      { label: "1", value: 7 }, { label: "0", value: 7 },
    ],
    countries: [{ label: "United States", value: 18 }, { label: "Canada", value: 3 }, { label: "United Kingdom", value: 2 }],
    cities: [{ label: "Austin", value: 10 }, { label: "Dallas", value: 5 }, { label: "Houston", value: 3 }, { label: "San Antonio", value: 2 }],
    pages: [{ label: "Home", value: 14 }, { label: "Services", value: 9 }, { label: "Contact", value: 4 }, { label: "Roofing estimate", value: 3 }],
    events: [{ label: "page_view", value: 26 }, { label: "scroll", value: 14 }, { label: "click", value: 8 }, { label: "form_submit", value: 3 }],
    keyEvents: [{ label: "phone_click", value: 4 }, { label: "form_submit", value: 3 }, { label: "quote_request", value: 2 }],
    audiences: [{ label: "All users", value: 23 }, { label: "Returning users", value: 6 }],
    platforms: [{ label: "desktop", value: 12 }, { label: "mobile", value: 9 }, { label: "tablet", value: 2 }],
    devices: [{ label: "desktop", value: 12 }, { label: "mobile", value: 9 }, { label: "tablet", value: 2 }],
    warnings: [],
  };
}

export async function GET() {
  const access = await requirePortalService("analytics");
  if (access.preview || !access.user?.clientId) {
    return NextResponse.json({ status: "PREVIEW", data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const [client, integration] = await Promise.all([
      prisma.client.findUnique({ where: { id: access.user.clientId }, select: { dataMode: true } }),
      prisma.googleIntegration.findUnique({ where: { clientId: access.user.clientId }, select: { status: true, ga4PropertyId: true } }),
    ]);
    const useManagedData = client?.dataMode === "MANAGED";
    if (integration?.status !== "CONNECTED" || !integration.ga4PropertyId) {
      if (useManagedData) return NextResponse.json({ status: "READY", data: managedRealtimeData() }, { headers: { "Cache-Control": "private, no-store" } });
      return NextResponse.json({ status: "NOT_CONNECTED", data: null }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }

    const { accessToken } = await getGoogleAccessToken(access.user.clientId);
    const data = await fetchGa4Realtime(accessToken, integration.ga4PropertyId);
    return NextResponse.json({ status: "READY", data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const client = await prisma.client.findUnique({ where: { id: access.user.clientId }, select: { dataMode: true } }).catch(() => null);
    if (client?.dataMode === "MANAGED") return NextResponse.json({ status: "READY", data: managedRealtimeData() }, { headers: { "Cache-Control": "private, no-store" } });
    const status = error instanceof GoogleOAuthError ? error.status : 502;
    const code = error instanceof GoogleOAuthError ? error.code : "GA4_REALTIME_FAILED";
    return NextResponse.json({ status: "ERROR", code, error: "Google Analytics realtime data is temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
