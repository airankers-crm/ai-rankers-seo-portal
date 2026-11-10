import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { getCurrentAppUser } from "../../../lib/auth/access";
import { parseSafeHttpUrl } from "../../../lib/security/urls";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "workspace";
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Your account is not active." }, { status: 403 });
  if (user.role !== "CLIENT") return NextResponse.json({ error: "Only client accounts need onboarding." }, { status: 400 });
  if (user.clientId) return NextResponse.json({ error: "Your workspace is already set up." }, { status: 409 });

  const recentWorkspaces = await prisma.client.count({ where: { contactEmail: user.email, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } });
  if (recentWorkspaces >= 3) return NextResponse.json({ error: "Please contact the agency before creating another workspace." }, { status: 429, headers: { "Retry-After": "3600" } });

  const body = await request.json().catch(() => null) as { businessName?: string; websiteUrl?: string } | null;
  const businessName = body?.businessName?.trim();
  if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  const websiteUrl = body?.websiteUrl?.trim() ? parseSafeHttpUrl(body.websiteUrl.trim()) : null;
  if (body?.websiteUrl?.trim() && !websiteUrl) return NextResponse.json({ error: "Website URL must use a safe http or https URL." }, { status: 400 });

  const baseSlug = slugify(businessName);
  const existing = await prisma.client.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existing ? `${baseSlug}-${existing + 1}` : baseSlug;

  let client;
  try {
    client = await prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({ where: { id: user.id }, select: { clientId: true, role: true, status: true } });
      if (!current || current.role !== "CLIENT" || current.status !== "ACTIVE" || current.clientId) throw new Error("ONBOARDING_ALREADY_COMPLETE");

      const created = await transaction.client.create({ data: { businessName, slug, websiteUrl, contactEmail: user.email } });
      const claimed = await transaction.user.updateMany({ where: { id: user.id, clientId: null, role: "CLIENT", status: "ACTIVE" }, data: { clientId: created.id } });
      if (claimed.count !== 1) throw new Error("ONBOARDING_ALREADY_COMPLETE");
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "ONBOARDING_ALREADY_COMPLETE") return NextResponse.json({ error: "Your workspace is already being set up." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Your workspace setup is already in progress." }, { status: 409 });
    throw error;
  }

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
