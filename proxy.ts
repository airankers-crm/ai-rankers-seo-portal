import { NextRequest, NextResponse } from "next/server";
import { getAuth, isAuthConfigured, requiresProductionAuth } from "./lib/auth/server";

const publicRoutes = [
  "/",
  "/invite",
  "/accept-invite",
  "/client/login",
  "/admin/login",
  "/login",
  "/forgot-password",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/reset-password",
  "/api/auth/redirect",
  "/api/health/db",
];

function isPublicPath(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public branding and static files must load before auth middleware runs.
  // Otherwise Next/Image receives the login redirect instead of the asset.
  if (!pathname.startsWith("/api/") && /\.[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }

  if (requiresProductionAuth() && !isAuthConfigured() && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    return new NextResponse("Authentication is not configured.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const auth = getAuth();
  if (!auth) return NextResponse.next();

  const adminRequest = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");

  return auth.middleware({
    loginUrl: adminRequest ? "/admin/login" : "/client/login",
    publicRoutes,
  })(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
