import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { isAdminRole, requireAdminAccess } from "../../../../../../lib/auth/access";
import { getAuth } from "../../../../../../lib/auth/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type AuthResult<T> = { data: T | null; error: { message?: string; status?: number } | null };
type AuthAdminApi = {
  setUserPassword(input: { userId: string; newPassword: string }): Promise<AuthResult<{ status: boolean }>>;
  createUser(input: { email: string; name: string; password: string }): Promise<AuthResult<{ id: string }>>;
};

function upstreamError(error: { message?: string; status?: number } | null | undefined) {
  const status = error?.status && error.status >= 400 && error.status < 500 ? error.status : 502;
  return NextResponse.json({ error: error?.message || "The authentication service could not update this password." }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to change portal passwords." }, { status: 401 });
  }
  if (access.user.role !== "SUPER_ADMIN" || !isAdminRole(access.user.role)) {
    return NextResponse.json({ error: "Only a super admin can change portal passwords." }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, clientId: true, authUserId: true, portalPasswordUpdatedAt: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const recentPasswordChanges = await prisma.auditLog.count({ where: { actorId: access.user.id, action: "USER_PASSWORD_UPDATED", createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recentPasswordChanges >= 10) return NextResponse.json({ error: "Please wait before changing more portal passwords." }, { status: 429, headers: { "Retry-After": "60" } });

  const body = await request.json().catch(() => null) as { newPassword?: unknown; confirmation?: unknown } | null;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmation = typeof body?.confirmation === "string" ? body.confirmation : "";
  if (newPassword.length < 8) return NextResponse.json({ error: "Use at least 8 characters for the new portal password." }, { status: 400 });
  if (newPassword.length > 128) return NextResponse.json({ error: "Use 128 characters or fewer for the new portal password." }, { status: 400 });
  if (newPassword !== confirmation) return NextResponse.json({ error: "The password confirmation does not match." }, { status: 400 });

  const auth = getAuth();
  if (!auth) return NextResponse.json({ error: "Neon Auth is not configured in this environment." }, { status: 503 });
  const authAdmin = auth.admin as unknown as AuthAdminApi;

  let authUserId = target.authUserId;
  if (authUserId) {
    const result = await authAdmin.setUserPassword({ userId: authUserId, newPassword });
    if (result.error) return upstreamError(result.error);
  } else {
    const result = await authAdmin.createUser({ email: target.email, name: target.name, password: newPassword });
    if (result.error) return upstreamError(result.error);
    authUserId = result.data?.id ?? null;
    if (!authUserId) return NextResponse.json({ error: "The portal account was not returned by the authentication service." }, { status: 502 });
  }

  const passwordUpdatedAt = new Date();
  const updated = await prisma.$transaction(async (transaction) => {
    const changed = await transaction.user.update({ where: { id: target.id }, data: { authUserId, portalPasswordUpdatedAt: passwordUpdatedAt }, include: { client: { select: { id: true, businessName: true } } } });
    await transaction.auditLog.create({ data: { clientId: changed.clientId, actorId: access.user!.id, action: "USER_PASSWORD_UPDATED", entityType: "User", entityId: changed.id, before: { passwordConfigured: Boolean(target.portalPasswordUpdatedAt), authAccountLinked: Boolean(target.authUserId) }, after: { passwordConfigured: true, authAccountLinked: true } } });
    return changed;
  });

  return NextResponse.json({ user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, status: updated.status, hasAuthAccount: Boolean(updated.authUserId), portalPasswordUpdatedAt: updated.portalPasswordUpdatedAt?.toISOString() ?? null, client: updated.client } });
}
