import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/auth/access";
import { GoogleOAuthError } from "../../../../../lib/google/oauth";
import { syncGoogleClient } from "../../../../../lib/google/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });

  const body = await request.json().catch(() => null) as { clientId?: unknown } | null;
  const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
  if (!clientId) return NextResponse.json({ error: "clientId is required." }, { status: 400 });

  try {
    const summary = await syncGoogleClient(clientId, "MANUAL");
    return NextResponse.json({ summary }, { status: summary.status === "FAILED" ? 502 : 200 });
  } catch (error) {
    const code = error instanceof GoogleOAuthError ? error.code : "GOOGLE_SYNC_FAILED";
    const status = error instanceof GoogleOAuthError ? error.status : 502;
    return NextResponse.json({ error: "Google sync could not be started.", code }, { status });
  }
}
