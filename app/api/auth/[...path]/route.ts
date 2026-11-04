import { NextResponse } from "next/server";
import { getAuth } from "../../../../lib/auth/server";

type RouteContext = { params: Promise<{ path: string[] }> };
type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function handle(method: Method) {
  return async (request: Request, context: RouteContext) => {
    const auth = getAuth();
    if (!auth) {
      return NextResponse.json({ error: "Authentication is not configured for this environment." }, { status: 503 });
    }
    return auth.handler()[method](request, context);
  };
}

export const GET = handle("GET");
export const POST = handle("POST");
export const PUT = handle("PUT");
export const DELETE = handle("DELETE");
export const PATCH = handle("PATCH");
