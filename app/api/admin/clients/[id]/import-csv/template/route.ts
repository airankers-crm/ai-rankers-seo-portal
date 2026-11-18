import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../../lib/auth/access";
import { generateCsvTemplate } from "../../../../../../../lib/csv-import";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }

  if (access.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can download the CSV template." }, { status: 403 });
  }

  const csv = generateCsvTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=metric-import-template.csv",
      "Cache-Control": "no-store",
    },
  });
}
