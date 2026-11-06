import { createNeonAuth } from "@neon/auth/next/server";

let cachedAuth: ReturnType<typeof createNeonAuth> | null = null;

export function isAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL?.trim() && process.env.NEON_AUTH_COOKIE_SECRET?.trim());
}

export function requiresProductionAuth() {
  return process.env.NODE_ENV === "production" || process.env.REQUIRE_AUTH === "true";
}

export function getAuth() {
  if (!isAuthConfigured()) return null;

  cachedAuth ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });

  return cachedAuth;
}

export async function getSession() {
  const auth = getAuth();
  if (!auth) return null;

  try {
    const { data } = await auth.getSession();
    return data ?? null;
  } catch (error) {
    console.error("Unable to read the Neon Auth session", error);
    return null;
  }
}
