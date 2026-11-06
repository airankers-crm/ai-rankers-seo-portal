import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requirePortalAccess } from "../../../../lib/auth/access";

const categories = new Set(["ISSUE", "QUESTION", "REQUEST", "PRAISE"]);

function normalizeContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value).slice(0, 10).map(([key, entry]) => [
    key.slice(0, 60),
    typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" ? entry : null,
  ]));
}

export async function POST(request: Request) {
  const access = await requirePortalAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Client authentication is required to send feedback." }, { status: 401 });

  const body = await request.json().catch(() => null) as { category?: string; message?: string; pagePath?: string; pageLabel?: string; context?: unknown } | null;
  const category = body?.category?.trim().toUpperCase();
  const message = body?.message?.trim();
  const pagePath = body?.pagePath?.trim();
  const pageLabel = body?.pageLabel?.trim();
  if (!category || !categories.has(category)) return NextResponse.json({ error: "Choose a feedback category." }, { status: 400 });
  if (!message || message.length > 2000) return NextResponse.json({ error: "Feedback must be between 1 and 2,000 characters." }, { status: 400 });
  if (!pagePath || pagePath.length > 200 || !pageLabel || pageLabel.length > 100) return NextResponse.json({ error: "A valid page context is required." }, { status: 400 });
  if (!access.user.clientId) return NextResponse.json({ error: "A client workspace is required." }, { status: 400 });

  const feedback = await prisma.$transaction(async (transaction) => {
    const created = await transaction.feedback.create({ data: { clientId: access.user.clientId as string, userId: access.user.id, category: category as "ISSUE" | "QUESTION" | "REQUEST" | "PRAISE", message, pagePath, pageLabel, context: normalizeContext(body?.context) ?? undefined } });
    await transaction.auditLog.create({ data: { clientId: access.user.clientId, actorId: access.user.id, action: "PORTAL_FEEDBACK_CREATED", entityType: "Feedback", entityId: created.id, after: { category, pagePath, pageLabel } } });
    return created;
  });

  return NextResponse.json({ feedback: { id: feedback.id, status: feedback.status } }, { status: 201 });
}
