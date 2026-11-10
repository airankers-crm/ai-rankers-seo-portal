import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../lib/auth/access";

export async function PATCH(request: Request) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Client authentication is required to update your profile." }, { status: 401 });

  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name || name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter a name between 2 and 80 characters." }, { status: 400 });

  const user = await prisma.user.update({ where: { id: access.user.id }, data: { name }, select: { id: true, name: true, email: true } });
  return NextResponse.json({ user });
}
