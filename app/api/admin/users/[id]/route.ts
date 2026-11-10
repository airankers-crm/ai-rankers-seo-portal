import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { isAdminRole, requireAdminAccess } from "../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

const roles = ["SUPER_ADMIN", "ADMIN", "CLIENT"] as const;
const statuses = ["ACTIVE", "INVITED", "DISABLED"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to update users." }, { status: 401 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (access.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can change user access." }, { status: 403 });
  }

  const recentAccessChanges = await prisma.auditLog.count({ where: { actorId: access.user.id, action: "USER_ACCESS_UPDATED", createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentAccessChanges >= 30) return NextResponse.json({ error: "Please wait before changing more user access settings." }, { status: 429, headers: { "Retry-After": "60" } });

  const body = await request.json().catch(() => null) as { role?: string; status?: string; clientId?: string | null } | null;
  const role = body?.role as (typeof roles)[number] | undefined;
  const status = body?.status as (typeof statuses)[number] | undefined;
  if (role && !roles.includes(role)) return NextResponse.json({ error: "Invalid user role." }, { status: 400 });
  if (status && !statuses.includes(status)) return NextResponse.json({ error: "Invalid user status." }, { status: 400 });

  if (target.id === access.user.id && status === "DISABLED") {
    return NextResponse.json({ error: "You cannot disable your own account." }, { status: 400 });
  }
  if (target.id === access.user.id && role && !isAdminRole(role)) {
    return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 400 });
  }
  const nextRole = role ?? target.role;
  let clientId = body?.clientId === undefined ? target.clientId : body.clientId || null;
  if (nextRole === "CLIENT" && !clientId) {
    return NextResponse.json({ error: "Client users must be assigned to a client workspace." }, { status: 400 });
  }
  if (nextRole !== "CLIENT") clientId = null;
  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return NextResponse.json({ error: "Client workspace not found." }, { status: 404 });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (transaction) => {
      const currentTarget = await transaction.user.findUnique({ where: { id } });
      if (!currentTarget) throw new Error("USER_NOT_FOUND");
      if (currentTarget.role === "SUPER_ADMIN" && nextRole !== "SUPER_ADMIN") {
        const activeSuperAdmins = await transaction.user.count({ where: { role: "SUPER_ADMIN", status: { not: "DISABLED" } } });
        if (activeSuperAdmins <= 1) throw new Error("LAST_ACTIVE_SUPER_ADMIN");
      }

      const changed = await transaction.user.update({
        where: { id },
        data: { role: nextRole, status: status ?? currentTarget.status, clientId },
        include: { client: { select: { id: true, businessName: true } } },
      });

      await transaction.auditLog.create({
        data: {
          clientId: changed.clientId,
          actorId: access.user.id,
          action: "USER_ACCESS_UPDATED",
          entityType: "User",
          entityId: changed.id,
          before: { role: currentTarget.role, status: currentTarget.status, clientId: currentTarget.clientId },
          after: { role: changed.role, status: changed.status, clientId: changed.clientId },
        },
      });
      return changed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (error instanceof Error && error.message === "LAST_ACTIVE_SUPER_ADMIN") return NextResponse.json({ error: "The last active super admin cannot be demoted." }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Another access change is in progress. Please try again." }, { status: 409 });
    throw error;
  }

  return NextResponse.json({ user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, status: updated.status, client: updated.client } });
}
