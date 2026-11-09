import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type SectionBody = { name?: unknown; isVisible?: unknown; publish?: unknown; position?: unknown };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to update a portal section." }, { status: 401 });

  const { id: clientId, sectionId } = await params;
  const existing = await prisma.section.findFirst({ where: { id: sectionId, clientId } });
  if (!existing) return NextResponse.json({ error: "Portal section not found for this client." }, { status: 404 });

  const body = await request.json().catch(() => null) as SectionBody | null;
  const name = text(body?.name) || existing.name;
  if (name.length > 80) return NextResponse.json({ error: "Section name must be 80 characters or fewer." }, { status: 400 });
  const position = body?.position === undefined ? existing.position : Number(body.position);
  if (!Number.isInteger(position) || position < 0) return NextResponse.json({ error: "Section position must be a positive whole number." }, { status: 400 });

  const section = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.section.update({
      where: { id: sectionId },
      data: {
        name,
        position,
        isVisible: typeof body?.isVisible === "boolean" ? body.isVisible : existing.isVisible,
        isDraft: typeof body?.publish === "boolean" ? body.publish !== true : existing.isDraft,
      },
    });
    await transaction.auditLog.create({
      data: {
        clientId,
        actorId: access.user!.id,
        action: "PORTAL_SECTION_UPDATED",
        entityType: "Section",
        entityId: sectionId,
        before: { name: existing.name, position: existing.position, isVisible: existing.isVisible, isDraft: existing.isDraft },
        after: { name: updated.name, position: updated.position, isVisible: updated.isVisible, isDraft: updated.isDraft },
      },
    });
    return updated;
  });

  return NextResponse.json({ section });
}
