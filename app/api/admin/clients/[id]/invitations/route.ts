import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to invite users." }, { status: 401 });
  }

  const { id: clientId } = await params;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, businessName: true, status: true } });
  if (!client) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });
  if (client.status !== "ACTIVE") return NextResponse.json({ error: "Invitations can only be created for active client workspaces." }, { status: 409 });

  const recentInvitations = await prisma.clientInvitation.count({ where: { invitedById: access.user.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentInvitations >= 20) return NextResponse.json({ error: "Please wait before creating more invitations." }, { status: 429, headers: { "Retry-After": "60" } });

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let invitation;
  try {
    invitation = await prisma.$transaction(async (transaction) => {
      await transaction.clientInvitation.updateMany({
        where: { clientId, email, status: "PENDING" },
        data: { status: "EXPIRED" },
      });

      const created = await transaction.clientInvitation.create({
        data: { clientId, email, role: "CLIENT", tokenHash, expiresAt, invitedById: access.user.id },
      });

      await transaction.auditLog.create({
        data: {
          clientId,
          actorId: access.user.id,
          action: "CLIENT_INVITATION_CREATED",
          entityType: "ClientInvitation",
          entityId: created.id,
          after: { email, role: "CLIENT", expiresAt: expiresAt.toISOString() },
        },
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Another invitation is being created. Please try again." }, { status: 409 });
    throw error;
  }

  const inviteUrl = new URL(`/invite/${token}`, request.url).toString();
  return NextResponse.json({ invitation: { id: invitation.id, email, clientName: client.businessName, expiresAt, inviteUrl } }, { status: 201 });
}
