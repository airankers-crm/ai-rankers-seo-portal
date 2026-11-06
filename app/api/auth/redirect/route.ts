import { NextRequest, NextResponse } from "next/server";
import { getCurrentAppUser, isAdminRole } from "../../../../lib/auth/access";
import { isAuthConfigured } from "../../../../lib/auth/server";

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

function isWithin(path: string, root: "/admin" | "/portal") {
  return path === root || path.startsWith(`${root}/`) || path.startsWith(`${root}?`);
}

export async function GET(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const user = await getCurrentAppUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.status === "DISABLED") {
    return NextResponse.json({ error: "This account has been disabled." }, { status: 403 });
  }

  const requestedPath = safeInternalPath(request.nextUrl.searchParams.get("redirectTo"));
  const isAdmin = isAdminRole(user.role);

  if (isAdmin) {
    return NextResponse.json({
      isAdmin: true,
      destination: requestedPath && isWithin(requestedPath, "/admin") ? requestedPath : "/admin",
    });
  }

  return NextResponse.json({
    isAdmin: false,
    destination: user.clientId
      ? requestedPath && isWithin(requestedPath, "/portal") ? requestedPath : "/portal"
      : "/onboarding",
  });
}
