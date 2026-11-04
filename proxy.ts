import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "./lib/auth/server";

export default function proxy(request: NextRequest) {
  const auth = getAuth();
  if (!auth) return NextResponse.next();

  return auth.middleware({
    loginUrl: "/auth/sign-in",
    publicRoutes: ["/"],
  })(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
