import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to view users." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, email: true, name: true, role: true, status: true, client: { select: { id: true, businessName: true } } },
  });

  return NextResponse.json({ users });
}
