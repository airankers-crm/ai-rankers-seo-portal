import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { fallbackEventId, hasWebhookSecret, normalizeMetformLead } from "../../../../../lib/metform";

export const dynamic = "force-dynamic";

function getProvidedSecret(request: Request) {
  const headerSecret = request.headers.get("x-metform-webhook-secret") ?? request.headers.get("x-webhook-secret");
  if (headerSecret) return headerSecret;
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length).trim();
  // MetForm's documented REST UI exposes a URL field but may not expose a
  // custom-header field. Keep the query-token fallback for that integration;
  // a header remains preferred when the installed version supports it.
  return new URL(request.url).searchParams.get("token");
}

export async function POST(request: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const expectedSecret = process.env.METFORM_WEBHOOK_SECRET;
  if (!expectedSecret) return NextResponse.json({ error: "MetForm webhook is not configured." }, { status: 503 });
  if (!hasWebhookSecret(getProvidedSecret(request), expectedSecret)) return NextResponse.json({ error: "Invalid webhook credentials." }, { status: 401 });

  const { clientId } = await params;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, status: true } });
  if (!client || client.status === "ARCHIVED") return NextResponse.json({ error: "Client workspace was not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const lead = normalizeMetformLead(body, request.headers);
  if ("error" in lead) return NextResponse.json({ error: lead.error }, { status: 400 });

  const source = "wordpress-metform";
  const sourceEventId = fallbackEventId(client.id, lead);
  const existing = await prisma.lead.findUnique({ where: { clientId_source_sourceEventId: { clientId: client.id, source, sourceEventId } }, select: { id: true } });
  if (existing) return NextResponse.json({ id: existing.id, duplicate: true, status: "accepted" }, { status: 200 });

  let created: { id: string };
  try {
    created = await prisma.lead.create({
      data: {
        clientId: client.id,
        source,
        sourceEventId,
        formId: lead.formId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        service: lead.service,
        message: lead.message,
        pageUrl: lead.pageUrl,
        submittedAt: lead.submittedAt,
      },
      select: { id: true },
    });
  } catch (error) {
    // Two webhook retries can arrive at the same time. The unique source key
    // makes the second request safe; return the first record instead of 500ing.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const duplicate = await prisma.lead.findUnique({ where: { clientId_source_sourceEventId: { clientId: client.id, source, sourceEventId } }, select: { id: true } });
      if (duplicate) return NextResponse.json({ id: duplicate.id, duplicate: true, status: "accepted" }, { status: 200 });
    }
    throw error;
  }

  return NextResponse.json({ id: created.id, duplicate: false, status: "accepted" }, { status: 201 });
}
