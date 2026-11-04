import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "client";
}

export async function POST(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to create a client." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { businessName?: string; websiteUrl?: string; contactEmail?: string } | null;
  const businessName = body?.businessName?.trim();
  if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

  let websiteUrl: string | null = null;
  if (body?.websiteUrl?.trim()) {
    try {
      websiteUrl = new URL(body.websiteUrl.trim()).toString();
    } catch {
      return NextResponse.json({ error: "Website URL must be a valid URL." }, { status: 400 });
    }
  }

  const contactEmail = body?.contactEmail?.trim() || null;
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Primary contact email must be valid." }, { status: 400 });
  }

  const baseSlug = slugify(businessName);
  const existing = await prisma.client.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing ? `${baseSlug}-${existing + 1}` : baseSlug;

  const client = await prisma.client.create({
    data: {
      businessName,
      slug,
      websiteUrl,
      contactEmail,
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
