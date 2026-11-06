import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "./lib/auth/server";

export default function proxy(request: NextRequest) {
  const auth = getAuth();
  if (!auth) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const adminRequest = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");

  return auth.middleware({
    loginUrl: adminRequest ? "/admin/login" : "/client/login",
    publicRoutes: ["/", "/invite", "/client/login", "/admin/login", "/login", "/forgot-password", "/accept-invite", "/api/auth/redirect"],
  })(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
