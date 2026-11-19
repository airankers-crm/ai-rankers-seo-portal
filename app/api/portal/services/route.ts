import { NextResponse } from "next/server";
import { requirePortalAccess } from "../../../../lib/auth/access";
import { getPortalServiceEntitlements } from "../../../../lib/portal-services";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requirePortalAccess();
  if (access.preview || !access.user?.clientId) {
    return NextResponse.json({ website: true, analytics: true, gbp: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const services = await getPortalServiceEntitlements(access.user.clientId);
  return NextResponse.json(services ?? { website: false, analytics: false, gbp: false }, { headers: { "Cache-Control": "no-store" } });
}
