import { redirect } from "next/navigation";
import { prisma } from "@ai-rankers/db";
import type { Role, User } from "@prisma/client";
import { getSession, isAuthConfigured } from "./server";

export async function getCurrentAppUser(): Promise<User | null> {
  const session = await getSession();
  const authUser = session?.user;
  if (!authUser) return null;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ authUserId: authUser.id }, { email: authUser.email }],
    },
  });

  if (existing) {
    if (existing.authUserId !== authUser.id || existing.name !== authUser.name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { authUserId: authUser.id, name: authUser.name || existing.name },
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

export async function requirePortalAccess() {
  if (!isAuthConfigured()) return { user: null, preview: true };

  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/sign-in?redirectTo=/portal");
  if (!user.clientId) redirect(user.role === "CLIENT" ? "/onboarding" : "/admin");

  return { user, preview: false };
}

export async function requireAdminAccess() {
  if (!isAuthConfigured()) return { user: null, preview: true };

  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/sign-in?redirectTo=/admin");
  if (!isAdminRole(user.role)) redirect("/portal");

  return { user, preview: false };
}

export function isAdminRole(role: Role) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
