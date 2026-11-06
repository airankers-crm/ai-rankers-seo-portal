import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getCurrentAppUser } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentAppUser();
  if (!user) return NextResponse.json({ error: "Sign in is required to accept an invitation." }, { status: 401 });
  if (user.status === "DISABLED") return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });

  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.clientInvitation.findUnique({ where: { tokenHash }, include: { client: { select: { businessName: true } } } });
  if (!invitation || invitation.status !== "PENDING") return NextResponse.json({ error: "This invitation is no longer available." }, { status: 404 });
  if (invitation.expiresAt <= new Date()) {
    await prisma.clientInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: `Sign in with ${invitation.email} to accept this invitation.` }, { status: 403 });
  }
  if (user.role === "CLIENT" && user.clientId && user.clientId !== invitation.clientId) {
    return NextResponse.json({ error: "This account is already assigned to another client workspace." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: invitation.role, status: "ACTIVE", clientId: invitation.clientId } }),
    prisma.clientInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } }),
  ]);

  return NextResponse.json({ redirectTo: "/portal", clientName: invitation.client.businessName });
}
