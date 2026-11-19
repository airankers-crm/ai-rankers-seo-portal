import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to reply." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message || message.length > 4000) return NextResponse.json({ error: "Reply must be between 1 and 4,000 characters." }, { status: 400 });

  const feedback = await prisma.feedback.findUnique({ where: { id }, select: { id: true, clientId: true } });
  if (!feedback) return NextResponse.json({ error: "Feedback record not found." }, { status: 404 });

  const reply = await prisma.$transaction(async (transaction) => {
    const created = await transaction.feedbackReply.create({ data: { feedbackId: feedback.id, authorId: access.user.id, message } });
    await transaction.feedback.update({ where: { id: feedback.id }, data: { status: "REVIEWED" } });
    await transaction.auditLog.create({ data: { clientId: feedback.clientId, actorId: access.user.id, action: "PORTAL_FEEDBACK_REPLIED", entityType: "Feedback", entityId: feedback.id, after: { replyId: created.id } } });
    return created;
  });

  return NextResponse.json({ reply: { id: reply.id, message: reply.message, createdAt: reply.createdAt.toISOString() }, status: "REVIEWED" }, { status: 201 });
}
