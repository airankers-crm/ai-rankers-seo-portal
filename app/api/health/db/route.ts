import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;

    return NextResponse.json({
      status: "ok",
      database: rows[0]?.ok === 1 ? "connected" : "unexpected",
    });
  } catch (error) {
    console.error("Database health check failed", error);
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
