import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../../lib/auth/access";
import { importCsvRows, normalizeImportScreen, parseXlsx } from "../../../../../../lib/csv-import";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to import Excel data." }, { status: 401 });
  }


  const { id: clientId } = await params;

  // This endpoint intentionally accepts Excel workbooks only.
  const contentType = request.headers.get("content-type") ?? "";
  let parsed: ReturnType<typeof parseXlsx>;
  const url = new URL(request.url);
  const screen = normalizeImportScreen(url.searchParams.get("screen"));

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "An Excel workbook (.xlsx) is required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Excel workbook must be smaller than 2 MB." }, { status: 400 });
    }
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx Excel workbooks are supported." }, { status: 400 });
    }
    parsed = parseXlsx(await file.arrayBuffer(), { screen });
  } else {
    return NextResponse.json({ error: "Upload an Excel workbook (.xlsx) using the file picker." }, { status: 415 });
  }

  // Parse the Excel workbook
  const { rows, errors } = parsed;
  if (errors.length > 0) {
    return NextResponse.json({ error: "Excel validation failed.", validationErrors: errors, parsed: 0 }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "No filled data rows found in the Excel workbook." }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Excel imports must contain 500 rows or fewer per import." }, { status: 400 });
  }

  // Check for dry-run mode (validate only, don't write)
  if (url.searchParams.get("dry_run") === "1") {
    return NextResponse.json({
      dryRun: true,
      total: rows.length,
      rows: rows.map((row) => ({ line: row.line, metricKey: row.metricKey, periodStart: row.periodStart, periodEnd: row.periodEnd, value: row.value, source: row.source })),
    });
  }

  // Execute the import
  try {
    const summary = await importCsvRows(clientId, rows, access.user.id);
    await prisma.client.update({ where: { id: clientId }, data: { dataMode: "MANAGED" } });
    return NextResponse.json({ summary, dataMode: "MANAGED" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
