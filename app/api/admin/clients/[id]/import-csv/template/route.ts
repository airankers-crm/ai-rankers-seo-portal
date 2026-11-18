import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";
import { generateCsvTemplate, generateXlsxTemplate, normalizeImportScreen } from "../../../../../../../lib/csv-import";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }

  if (access.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can download the CSV template." }, { status: 403 });
  }

  const url = new URL(request.url);
  const screen = normalizeImportScreen(url.searchParams.get("screen"));
  const includePreviousPeriod = url.searchParams.get("include_previous") === "1";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (format === "xlsx") {
    const workbook = generateXlsxTemplate(screen, { includePreviousPeriod });
    return new NextResponse(Buffer.from(workbook), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=" + screen + "-metric-import-template.xlsx",
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = generateCsvTemplate(screen, { includePreviousPeriod });
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=" + screen + "-metric-import-template.csv",
      "Cache-Control": "no-store",
    },
  });
}
