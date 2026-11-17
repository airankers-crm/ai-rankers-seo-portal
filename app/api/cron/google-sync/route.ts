import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncAllConnectedClients } from "../../../../lib/google/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function hasValidCronSecret(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  if (!hasValidCronSecret(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const results = await syncAllConnectedClients("SCHEDULED");
  return NextResponse.json({ results: results.map(({ clientId, status, rowsFetched, rowsWritten, rowsSkipped, rowsOverridden, warningCount, errorCode }) => ({ clientId, status, rowsFetched, rowsWritten, rowsSkipped, rowsOverridden, warningCount, ...(errorCode ? { errorCode } : {}) })) });
}
