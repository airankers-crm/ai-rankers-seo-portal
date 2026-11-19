import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { getWorkspaceSettings } from "../../../../lib/admin-settings";
import { parseSafeHttpUrl } from "../../../../lib/security/urls";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "client";
}

async function getUniqueSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;
  while (await prisma.client.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    const suffixLabel = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 60 - suffixLabel.length)}${suffixLabel}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to create a client." }, { status: 401 });
  }

  const recentClients = await prisma.auditLog.count({ where: { actorId: access.user.id, action: "CLIENT_CREATED", createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentClients >= 10) return NextResponse.json({ error: "Please wait before creating more client workspaces." }, { status: 429, headers: { "Retry-After": "60" } });

  const body = await request.json().catch(() => null) as { businessName?: string; websiteUrl?: string; contactEmail?: string } | null;
  const businessName = body?.businessName?.trim();
  if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (businessName.length < 2) return NextResponse.json({ error: "Business name must be at least 2 characters." }, { status: 400 });
  if (businessName.length > 120) return NextResponse.json({ error: "Business name must be 120 characters or fewer." }, { status: 400 });

  let websiteUrl: string | null = null;
  if (body?.websiteUrl?.trim()) {
    websiteUrl = parseSafeHttpUrl(body.websiteUrl.trim());
    if (!websiteUrl) return NextResponse.json({ error: "Website URL must use a safe http or https URL." }, { status: 400 });
  }

  const contactEmail = body?.contactEmail?.trim() || null;
  if (contactEmail && (contactEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(contactEmail))) {
    return NextResponse.json({ error: "Primary contact email must be valid." }, { status: 400 });
  }

  const baseSlug = slugify(businessName);
  const slug = await getUniqueSlug(baseSlug);
  const workspaceSettings = await getWorkspaceSettings();

  const client = await prisma.client.create({
    data: {
      businessName,
      slug,
      websiteUrl,
      contactEmail,
      timezone: workspaceSettings.defaultTimezone,
      sections: {
        create: [
          { name: "Overview", kind: "OVERVIEW", position: 0 },
          { name: "Website SEO", kind: "WEBSITE", position: 1 },
          { name: "GBP Performance", kind: "GBP", position: 2 },
        ],
      },
      auditLogs: {
        create: {
          actorId: access.user.id,
          action: "CLIENT_CREATED",
          entityType: "Client",
        },
      },
    },
  });

  return NextResponse.json({ id: client.id, slug: client.slug }, { status: 201 });
}
