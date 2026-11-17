import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/auth/access";
import { GoogleOAuthError } from "../../../../../lib/google/oauth";
import { discoverGoogleResources } from "../../../../../lib/google/discovery";
import { getGoogleAccessToken } from "../../../../../lib/google/tokens";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId is required." }, { status: 400 });

  try {
    const { accessToken } = await getGoogleAccessToken(clientId);
    const result = await discoverGoogleResources(accessToken);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof GoogleOAuthError ? error.status : 502;
    const code = error instanceof GoogleOAuthError ? error.code : "GOOGLE_DISCOVERY_FAILED";
    return NextResponse.json({ error: "Google resources could not be loaded.", code }, { status });
  }
}
