import { redirect } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import type { Role, User } from "@prisma/client";
import { getSession, isAuthConfigured, requiresProductionAuth } from "./server";

export async function getCurrentAppUser(): Promise<User | null> {
  const session = await getSession();
  const authUser = session?.user;
  if (!authUser) return null;

  const existingByAuthId = await prisma.user.findUnique({ where: { authUserId: authUser.id } });
  const existingByEmail = existingByAuthId ? null : await prisma.user.findUnique({ where: { email: authUser.email } });
  const existing = existingByAuthId ?? existingByEmail;

  if (existing) {
    // An already-linked local account must never be rebound solely because a
    // different auth identity presents the same email address. An unlinked
    // local record may only be linked after the auth provider verifies email ownership.
    if (existing.authUserId && existing.authUserId !== authUser.id) return null;
    if (existingByEmail && !existing.authUserId && authUser.emailVerified !== true) return null;
    if (existing.authUserId !== authUser.id || (authUser.name && existing.name !== authUser.name)) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { ...(existing.authUserId ? {} : { authUserId: authUser.id }), ...(authUser.name ? { name: authUser.name } : {}) },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      authUserId: authUser.id,
      email: authUser.email,
      name: authUser.name || authUser.email.split("@")[0],
      role: "CLIENT",
      status: "ACTIVE",
    },
  });
}

function redirectForAuthFailure(scope: "portal" | "admin", reason: "configuration" | "disabled" | "pending" | "workspace_unavailable") {
  const loginPath = scope === "admin" ? "/admin/login" : "/client/login";
  redirect(`${loginPath}?error=auth_${reason}`);
}

function requireActiveUser(user: User, scope: "portal" | "admin") {
  if (user.status === "DISABLED") redirectForAuthFailure(scope, "disabled");
  if (user.status !== "ACTIVE") redirectForAuthFailure(scope, "pending");
}

export async function requirePortalAccess() {
  if (!isAuthConfigured()) {
    if (requiresProductionAuth()) redirectForAuthFailure("portal", "configuration");
    return { user: null, preview: true };
  }

  const user = await getCurrentAppUser();
  if (!user) redirect("/client/login?redirectTo=/portal");
  requireActiveUser(user, "portal");
  if (!user.clientId) redirect(user.role === "CLIENT" ? "/onboarding" : "/admin");
  const client = await prisma.client.findUnique({ where: { id: user.clientId }, select: { status: true } });
  if (!client || client.status !== "ACTIVE") redirectForAuthFailure("portal", "workspace_unavailable");

  return { user, preview: false };
}

export async function requireAdminAccess() {
  if (!isAuthConfigured()) {
    if (requiresProductionAuth()) redirectForAuthFailure("admin", "configuration");
    return { user: null, preview: true };
  }

  const user = await getCurrentAppUser();
  if (!user) redirect("/admin/login?redirectTo=/admin");
  requireActiveUser(user, "admin");
  if (!isAdminRole(user.role)) redirect("/portal");

  return { user, preview: false };
}

export function isAdminRole(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
