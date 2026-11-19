import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { getWorkspaceSettings } from "../../../../lib/admin-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ feedback: 0 }, { headers: { "Cache-Control": "no-store" } });

  const settings = await getWorkspaceSettings();
  const feedback = settings.notifyClientFeedback ? await prisma.feedback.count({ where: { status: "OPEN" } }) : 0;
  return NextResponse.json({ feedback }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });

  const updated = await prisma.feedback.updateMany({ where: { status: "OPEN" }, data: { status: "REVIEWED" } });
  return NextResponse.json({ markedReviewed: updated.count });
}
