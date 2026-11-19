import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalService } from "../../../../../lib/auth/access";
import { GoogleOAuthError } from "../../../../../lib/google/oauth";
import { fetchGa4Realtime } from "../../../../../lib/google/reporting";
import { getGoogleAccessToken } from "../../../../../lib/google/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePortalService("analytics");
  if (access.preview || !access.user?.clientId) {
    return NextResponse.json({ status: "PREVIEW", data: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const client = await prisma.client.findUnique({ where: { id: access.user.clientId }, select: { dataMode: true } });
    if (client?.dataMode === "MANAGED") {
      return NextResponse.json({ status: "MANAGED_MODE", data: null }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }
    const integration = await prisma.googleIntegration.findUnique({ where: { clientId: access.user.clientId }, select: { status: true, ga4PropertyId: true } });
    if (integration?.status !== "CONNECTED" || !integration.ga4PropertyId) {
      return NextResponse.json({ status: "NOT_CONNECTED", data: null }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }

    const { accessToken } = await getGoogleAccessToken(access.user.clientId);
    const data = await fetchGa4Realtime(accessToken, integration.ga4PropertyId);
    return NextResponse.json({ status: "READY", data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof GoogleOAuthError ? error.status : 502;
    const code = error instanceof GoogleOAuthError ? error.code : "GA4_REALTIME_FAILED";
    return NextResponse.json({ status: "ERROR", code, error: "Google Analytics realtime data is temporarily unavailable." }, { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
