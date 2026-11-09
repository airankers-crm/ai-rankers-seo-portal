import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";

export const dynamic = "force-dynamic";

type SectionBody = { name?: unknown; isVisible?: unknown; publish?: unknown; position?: unknown; presentation?: Record<string, unknown> };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const defaultGbpPresentation = {
  pageTitle: "Google Business Profile",
  pageSubtitle: "Performance from Google Search and Maps.",
  filterLabel: "Filter report",
  channelLabel: "Search + Maps",
  displayLabel: "Monthly",
  chartTitle: "Profile views over time",
  insightTitle: "Key insights",
  insightOne: "Calls increased {{callsChange}} compared with the previous period.",
  insightTwo: "Website clicks are {{websiteTrend}}.",
  insightSource: "Data is sourced from Google Search and Maps.",
};

function presentationText(value: unknown, fallback: string, maxLength: number) {
  return (text(value) || fallback).slice(0, maxLength);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to update a portal section." }, { status: 401 });

  const { id: clientId, sectionId } = await params;
  const existing = await prisma.section.findFirst({ where: { id: sectionId, clientId } });
  if (!existing) return NextResponse.json({ error: "Portal section not found for this client." }, { status: 404 });

  const body = await request.json().catch(() => null) as SectionBody | null;
  const name = text(body?.name) || existing.name;
  if (name.length > 80) return NextResponse.json({ error: "Section name must be 80 characters or fewer." }, { status: 400 });
  const position = body?.position === undefined ? existing.position : Number(body.position);
  if (!Number.isInteger(position) || position < 0) return NextResponse.json({ error: "Section position must be a positive whole number." }, { status: 400 });

  const section = await prisma.$transaction(async (transaction) => {
    await transaction.section.update({
      where: { id: sectionId },
      data: {
        name,
        position,
        isVisible: typeof body?.isVisible === "boolean" ? body.isVisible : existing.isVisible,
        isDraft: typeof body?.publish === "boolean" ? body.publish !== true : existing.isDraft,
      },
    });
    if (existing.kind === "GBP" && body?.presentation) {
      const current = await transaction.gbpPresentation.findUnique({ where: { sectionId } });
      const presentation = {
        pageTitle: presentationText(body.presentation.pageTitle, current?.pageTitle ?? defaultGbpPresentation.pageTitle, 80),
        pageSubtitle: presentationText(body.presentation.pageSubtitle, current?.pageSubtitle ?? defaultGbpPresentation.pageSubtitle, 140),
        filterLabel: presentationText(body.presentation.filterLabel, current?.filterLabel ?? defaultGbpPresentation.filterLabel, 50),
        channelLabel: presentationText(body.presentation.channelLabel, current?.channelLabel ?? defaultGbpPresentation.channelLabel, 50),
        displayLabel: presentationText(body.presentation.displayLabel, current?.displayLabel ?? defaultGbpPresentation.displayLabel, 50),
        chartTitle: presentationText(body.presentation.chartTitle, current?.chartTitle ?? defaultGbpPresentation.chartTitle, 100),
        insightTitle: presentationText(body.presentation.insightTitle, current?.insightTitle ?? defaultGbpPresentation.insightTitle, 80),
        insightOne: presentationText(body.presentation.insightOne, current?.insightOne ?? defaultGbpPresentation.insightOne, 180),
        insightTwo: presentationText(body.presentation.insightTwo, current?.insightTwo ?? defaultGbpPresentation.insightTwo, 180),
        insightSource: presentationText(body.presentation.insightSource, current?.insightSource ?? defaultGbpPresentation.insightSource, 180),
      };
      await transaction.gbpPresentation.upsert({ where: { sectionId }, create: { sectionId, ...presentation }, update: presentation });
    }
    const updated = await transaction.section.findUniqueOrThrow({ where: { id: sectionId }, include: { presentation: true } });
    await transaction.auditLog.create({
      data: {
        clientId,
        actorId: access.user!.id,
        action: "PORTAL_SECTION_UPDATED",
        entityType: "Section",
        entityId: sectionId,
        before: { name: existing.name, position: existing.position, isVisible: existing.isVisible, isDraft: existing.isDraft },
        after: { name: updated.name, position: updated.position, isVisible: updated.isVisible, isDraft: updated.isDraft, presentation: updated.presentation ? { pageTitle: updated.presentation.pageTitle, pageSubtitle: updated.presentation.pageSubtitle, filterLabel: updated.presentation.filterLabel, channelLabel: updated.presentation.channelLabel, displayLabel: updated.presentation.displayLabel, chartTitle: updated.presentation.chartTitle, insightTitle: updated.presentation.insightTitle, insightOne: updated.presentation.insightOne, insightTwo: updated.presentation.insightTwo, insightSource: updated.presentation.insightSource } : null },
      },
    });
    return updated;
  });

  return NextResponse.json({ section });
}
