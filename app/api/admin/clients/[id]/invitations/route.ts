import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to invite users." }, { status: 401 });
  }

  const { id: clientId } = await params;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, businessName: true } });
  if (!client) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.clientInvitation.updateMany({
    where: { clientId, email, status: "PENDING" },
    data: { status: "EXPIRED" },
  });

  const invitation = await prisma.clientInvitation.create({
    data: { clientId, email, role: "CLIENT", tokenHash, expiresAt, invitedById: access.user.id },
  });

  await prisma.auditLog.create({
    data: {
      clientId,
      actorId: access.user.id,
      action: "CLIENT_INVITATION_CREATED",
      entityType: "ClientInvitation",
      entityId: invitation.id,
      after: { email, role: "CLIENT", expiresAt: expiresAt.toISOString() },
    },
  });

  const inviteUrl = new URL(`/invite/${token}`, request.url).toString();
  return NextResponse.json({ invitation: { id: invitation.id, email, clientName: client.businessName, expiresAt, inviteUrl } }, { status: 201 });
}
