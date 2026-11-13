import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { getCurrentAppUser, isAdminRole } from "../../../../../lib/auth/access";
import { readStoredReport, ReportStorageError } from "../../../../../lib/report-storage";
import { requiresProductionAuth } from "../../../../../lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true, clientId: true, storageKey: true, originalFileName: true, mimeType: true, sizeBytes: true, isVisible: true } });
  if (!report || !report.storageKey) return NextResponse.json({ error: "Report PDF not found." }, { status: 404 });

  const user = await getCurrentAppUser();
  if (!user && requiresProductionAuth()) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  if (user && !isAdminRole(user.role) && (user.clientId !== report.clientId || !report.isVisible)) return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 });
  if (!user && !report.isVisible) return NextResponse.json({ error: "This report is not available." }, { status: 403 });

  try {
    const stored = await readStoredReport(report.storageKey);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeName = (report.originalFileName || "report.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
    return new NextResponse(stored.stream, {
      headers: {
        "Content-Type": stored.contentType || report.mimeType || "application/pdf",
        "Content-Length": String(stored.sizeBytes || report.sizeBytes || 0),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ReportStorageError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "The report PDF could not be opened." }, { status: 500 });
  }
}
