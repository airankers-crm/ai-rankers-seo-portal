import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getCurrentAppUser } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "workspace";
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Only client accounts need onboarding." }, { status: 400 });
  if (user.clientId) return NextResponse.json({ error: "Your workspace is already set up." }, { status: 409 });

  const body = await request.json().catch(() => null) as { businessName?: string; websiteUrl?: string } | null;
  const businessName = body?.businessName?.trim();
  if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

  const baseSlug = slugify(businessName);
  const existing = await prisma.client.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing ? `${baseSlug}-${existing + 1}` : baseSlug;

  const client = await prisma.client.create({
    data: {
      businessName,
      slug,
      websiteUrl: body?.websiteUrl?.trim() || null,
      contactEmail: user.email,
      users: { connect: { id: user.id } },
    },
  });

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
