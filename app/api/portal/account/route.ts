import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../lib/auth/access";
import { defaultPortalPreferences, parsePortalPreferences } from "../../../../lib/portal-preferences";

export async function GET() {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) return NextResponse.json({ user: null, preferences: defaultPortalPreferences });
  return NextResponse.json({
    user: { id: access.user.id, name: access.user.name, email: access.user.email },
    preferences: parsePortalPreferences(access.user.portalPreferences),
  });
}

export async function PATCH(request: Request) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Client authentication is required to update your profile." }, { status: 401 });

  const body = await request.json().catch(() => null) as { name?: unknown; preferences?: unknown } | null;
  if (!body) return NextResponse.json({ error: "A profile or preference update is required." }, { status: 400 });

  const hasName = Object.hasOwn(body, "name");
  const hasPreferences = Object.hasOwn(body, "preferences");
  if (!hasName && !hasPreferences) return NextResponse.json({ error: "A profile or preference update is required." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (hasName && (name.length < 2 || name.length > 80)) return NextResponse.json({ error: "Enter a name between 2 and 80 characters." }, { status: 400 });
  if (hasPreferences && (!body.preferences || typeof body.preferences !== "object" || Array.isArray(body.preferences))) {
    return NextResponse.json({ error: "Preference values are invalid." }, { status: 400 });
  }
  const preferences = parsePortalPreferences(body.preferences);

  const user = await prisma.user.update({
    where: { id: access.user.id },
    data: { ...(hasName ? { name } : {}), ...(hasPreferences ? { portalPreferences: preferences } : {}) },
    select: { id: true, name: true, email: true, portalPreferences: true },
  });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, preferences: parsePortalPreferences(user.portalPreferences) });
}
