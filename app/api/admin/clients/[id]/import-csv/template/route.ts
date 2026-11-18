import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";
import { generateXlsxTemplate, normalizeImportScreen } from "../../../../../../../lib/csv-import";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }


  const url = new URL(request.url);
  const screen = normalizeImportScreen(url.searchParams.get("screen"));
  const includePreviousPeriod = url.searchParams.get("include_previous") === "1";
  if (url.searchParams.get("format") !== "xlsx") {
    return NextResponse.json({ error: "Only Excel (.xlsx) templates are supported." }, { status: 415 });
  }

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
