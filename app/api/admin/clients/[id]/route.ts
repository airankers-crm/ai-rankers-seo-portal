import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to update a client." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });

  const body = await request.json().catch(() => null) as { websiteUrl?: string; contactEmail?: string; timezone?: string; hasWebsiteSeo?: boolean; hasGbpSeo?: boolean } | null;
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
    return NextResponse.json({ error: "Contact email must be valid." }, { status: 400 });
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      websiteUrl,
      contactEmail,
      timezone: body?.timezone?.trim() || existing.timezone,
      hasWebsiteSeo: body?.hasWebsiteSeo ?? existing.hasWebsiteSeo,
      hasGbpSeo: body?.hasGbpSeo ?? existing.hasGbpSeo,
    },
  });

  await prisma.auditLog.create({
    data: {
      clientId: updated.id,
      actorId: access.user.id,
      action: "CLIENT_SETTINGS_UPDATED",
      entityType: "Client",
      entityId: updated.id,
      after: { websiteUrl: updated.websiteUrl, contactEmail: updated.contactEmail, timezone: updated.timezone, hasWebsiteSeo: updated.hasWebsiteSeo, hasGbpSeo: updated.hasGbpSeo },
    },
  });

  return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt });
}
