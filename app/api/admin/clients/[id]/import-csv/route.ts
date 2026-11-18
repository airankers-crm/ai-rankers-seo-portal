import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../../lib/auth/access";
import { importCsvRows, parseCsv } from "../../../../../../lib/csv-import";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) {
    return NextResponse.json({ error: "Admin authentication is required to import CSV data." }, { status: 401 });
  }

  if (access.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only a super admin can import CSV metric data." }, { status: 403 });
  }

  const { id: clientId } = await params;

  // Accept either multipart form (file upload) or raw text body
  const contentType = request.headers.get("content-type") ?? "";
  let csvText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "CSV file must be smaller than 2 MB." }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    csvText = await request.text();
    if (!csvText.trim()) {
      return NextResponse.json({ error: "Request body must contain CSV text." }, { status: 400 });
    }
    if (csvText.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "CSV payload must be smaller than 2 MB." }, { status: 400 });
    }
  }

  // Parse the CSV
  const { rows, errors } = parseCsv(csvText);
  if (errors.length > 0) {
    return NextResponse.json({ error: "CSV validation failed.", validationErrors: errors, parsed: 0 }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid data rows found in the CSV." }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "CSV must contain 500 rows or fewer per import." }, { status: 400 });
  }

  // Check for dry-run mode (validate only, don't write)
  const url = new URL(request.url);
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
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
