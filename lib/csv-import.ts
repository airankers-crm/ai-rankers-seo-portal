import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { GOOGLE_METRIC_DEFINITIONS } from "./google/provision";

type Database = PrismaClient | Prisma.TransactionClient;

const VALID_SOURCES = ["MANUAL", "GSC", "GA4", "GBP", "DATAFORSEO"] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

/** Every metric key the portal can display, with its default metadata. */
export const ALL_METRIC_DEFINITIONS = [
  ...GOOGLE_METRIC_DEFINITIONS,
  { key: "kw-top10", name: "Keywords in top 10", description: "Tracked keywords currently appearing within the first ten organic results.", source: "DATAFORSEO" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "RANK" as const },
  { key: "ga4-channel-organic", name: "Organic search traffic", description: "Sessions attributed to the organic search channel.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-channel-direct", name: "Direct traffic", description: "Sessions from direct navigation.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-channel-referral", name: "Referral traffic", description: "Sessions from referring websites.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-channel-email", name: "Email traffic", description: "Sessions from email campaigns.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
  { key: "ga4-channel-paid-social", name: "Paid social traffic", description: "Sessions from paid social campaigns.", source: "GA4" as const, section: "WEBSITE" as const, displayType: "NUMBER_CARD" as const, valueFormat: "INTEGER" as const },
] as const;

const METRIC_BY_KEY = new Map<string, (typeof ALL_METRIC_DEFINITIONS)[number]>(ALL_METRIC_DEFINITIONS.map((definition) => [definition.key, definition]));

const SECTION_DEFAULTS: Record<string, { name: string; position: number }> = {
  OVERVIEW: { name: "Overview", position: 0 },
  WEBSITE: { name: "Website SEO", position: 1 },
  GBP: { name: "GBP Performance", position: 2 },
};

export type CsvRow = {
  line: number;
  metricKey: string;
  periodStart: string;
  periodEnd: string;
  value: string;
  source: string;
  note: string;
};

export type CsvRowError = {
  line: number;
  field: string;
  message: string;
};

export type ImportRowResult = {
  line: number;
  metricKey: string;
  outcome: "created" | "updated" | "overridden" | "error";
  message?: string;
};

export type ImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ImportRowResult[];
};

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

function parseCsvLine(raw: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < raw.length; i++) {
    const character = raw[i];
    if (inQuotes) {
      if (character === '"') {
        if (raw[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      fields.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  fields.push(current.trim());
  return fields;
}

const HEADER_ALIASES: Record<string, string> = {
  metric_key: "metric_key",
  metric: "metric_key",
  key: "metric_key",
  period_start: "period_start",
  periodstart: "period_start",
  start: "period_start",
  period_end: "period_end",
  periodend: "period_end",
  end: "period_end",
  value: "value",
  source: "source",
  note: "note",
  notes: "note",
};

export function parseCsv(text: string): { rows: CsvRow[]; errors: CsvRowError[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headerLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (headerLineIndex === -1) return { rows: [], errors: [{ line: 1, field: "file", message: "The CSV must have a header row and at least one data row." }] };

  const headerFields = parseCsvLine(lines[headerLineIndex]).map((header) => HEADER_ALIASES[header.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z_]/g, "")] ?? "");
  const columnIndex: Record<string, number> = {};
  for (let i = 0; i < headerFields.length; i++) {
    if (headerFields[i] && columnIndex[headerFields[i]] === undefined) columnIndex[headerFields[i]] = i;
  }

  const requiredColumns = ["metric_key", "period_start", "period_end", "value"];
  const missingColumns = requiredColumns.filter((column) => columnIndex[column] === undefined);
  if (missingColumns.length > 0) {
    return { rows: [], errors: [{ line: 1, field: "header", message: `Missing required column${missingColumns.length > 1 ? "s" : ""}: ${missingColumns.join(", ")}` }] };
  }

  const rows: CsvRow[] = [];
  const errors: CsvRowError[] = [];
  const seenRows = new Set<string>();

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    if (!lines[i].trim()) continue;

    const fields = parseCsvLine(lines[i]);
    const metricKey = (fields[columnIndex.metric_key] ?? "").toLowerCase();
    const periodStart = fields[columnIndex.period_start] ?? "";
    const periodEnd = fields[columnIndex.period_end] ?? "";
    const value = fields[columnIndex.value] ?? "";
    const source = (fields[columnIndex.source ?? -1] ?? "").toUpperCase();
    const note = fields[columnIndex.note ?? -1] ?? "";

    // Generated templates contain placeholder rows with no value. Ignore those
    // rows so operators can fill only the metrics they want to import.
    if (!value && !note) continue;

    if (!metricKey) { errors.push({ line: lineNumber, field: "metric_key", message: "Metric key is required." }); continue; }
    const definition = METRIC_BY_KEY.get(metricKey);
    if (!definition) { errors.push({ line: lineNumber, field: "metric_key", message: `Unknown metric key: ${metricKey}. Download a current template or use a supported metric key.` }); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) { errors.push({ line: lineNumber, field: "period_start", message: "Period start must be YYYY-MM-DD." }); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) { errors.push({ line: lineNumber, field: "period_end", message: "Period end must be YYYY-MM-DD." }); continue; }
    if (!value || !Number.isFinite(Number(value))) { errors.push({ line: lineNumber, field: "value", message: "Value must be a valid number." }); continue; }

    const startDate = parseDateOnly(periodStart, false);
    const endDate = parseDateOnly(periodEnd, true);
    if (!startDate) { errors.push({ line: lineNumber, field: "period_start", message: "Invalid start date." }); continue; }
    if (!endDate) { errors.push({ line: lineNumber, field: "period_end", message: "Invalid end date." }); continue; }
    if (endDate < startDate) { errors.push({ line: lineNumber, field: "period_end", message: "End date must be on or after start date." }); continue; }

    if (source && !VALID_SOURCES.includes(source as ValidSource)) {
      errors.push({ line: lineNumber, field: "source", message: `Source must be one of: ${VALID_SOURCES.join(", ")}` });
      continue;
    }

    const effectiveSource = source || definition.source;
    const duplicateKey = `${metricKey}|${periodStart}|${periodEnd}|${effectiveSource}`;
    if (seenRows.has(duplicateKey)) {
      errors.push({ line: lineNumber, field: "metric_key", message: "Duplicate metric, period, and source row." });
      continue;
    }
    seenRows.add(duplicateKey);

    rows.push({ line: lineNumber, metricKey, periodStart, periodEnd, value, source: effectiveSource, note });
  }

  return { rows, errors };
}

function parseDateOnly(value: string, endOfDay: boolean): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  date.setUTCFullYear(year, month - 1, day);

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

// ---------------------------------------------------------------------------
// Import execution
// ---------------------------------------------------------------------------

async function ensureSectionAndMetric(
  clientId: string,
  metricKey: string,
  sourceOverride: ValidSource | "",
  database: Database,
): Promise<{ metricId: string; source: ValidSource }> {
  const definition = METRIC_BY_KEY.get(metricKey);
  const source: ValidSource = (sourceOverride as ValidSource) || (definition?.source as ValidSource) || "MANUAL";
  const sectionKind = definition?.section ?? "WEBSITE";

  // Ensure section exists
  let section = await database.section.findFirst({ where: { clientId, kind: sectionKind }, select: { id: true } });
  if (!section) {
    const defaults = SECTION_DEFAULTS[sectionKind] ?? { name: sectionKind, position: 99 };
    section = await database.section.create({ data: { clientId, kind: sectionKind, ...defaults, isVisible: true, isDraft: true }, select: { id: true } });
  }

  // Ensure metric exists
  let metric = await database.metric.findUnique({ where: { clientId_key: { clientId, key: metricKey } }, select: { id: true } });
  if (!metric) {
    const position = ((await database.metric.aggregate({ where: { clientId }, _max: { position: true } }))._max.position ?? -1) + 1;
    metric = await database.metric.create({
      data: {
        clientId,
        sectionId: section.id,
        key: metricKey,
        name: definition?.name ?? metricKey,
        description: definition?.description ?? null,
        displayType: definition?.displayType ?? "NUMBER_CARD",
        valueFormat: definition?.valueFormat ?? "INTEGER",
        source,
        higherIsBetter: true,
        position,
        isVisible: true,
        isDraft: true,
      },
      select: { id: true },
    });
  }

  return { metricId: metric.id, source };
}

export async function importCsvRows(
  clientId: string,
  rows: CsvRow[],
  actorId: string,
): Promise<ImportSummary> {
  const { prisma } = await import("@ai-rankers/db");
  const results: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errorCount = 0;

  // Process in a single transaction with a generous timeout for large imports
  await prisma.$transaction(async (transaction) => {
    for (const row of rows) {
      try {
        const { metricId, source } = await ensureSectionAndMetric(clientId, row.metricKey, row.source as ValidSource | "", transaction);
        const periodStart = new Date(`${row.periodStart}T00:00:00.000Z`);
        const periodEnd = new Date(`${row.periodEnd}T23:59:59.999Z`);
        const numericValue = Number(row.value);

        // Check for existing manual override
        const existing = await transaction.metricValue.findUnique({
          where: { metricId_periodStart_periodEnd_source: { metricId, periodStart, periodEnd, source } },
          select: { id: true, isOverride: true },
        });

        if (existing?.isOverride) {
          results.push({ line: row.line, metricKey: row.metricKey, outcome: "overridden", message: "Skipped — manual override exists." });
          skipped++;
          continue;
        }

        await transaction.metricValue.upsert({
          where: { metricId_periodStart_periodEnd_source: { metricId, periodStart, periodEnd, source } },
          update: { value: new Prisma.Decimal(numericValue), note: row.note || null, isOverride: false },
          create: { metricId, periodStart, periodEnd, value: new Prisma.Decimal(numericValue), source, note: row.note || null },
        });

        const outcome = existing ? "updated" : "created";
        results.push({ line: row.line, metricKey: row.metricKey, outcome });
        if (outcome === "created") created++;
        else updated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        results.push({ line: row.line, metricKey: row.metricKey, outcome: "error", message });
        errorCount++;
      }
    }

    // Single audit log entry for the whole import
    await transaction.auditLog.create({
      data: {
        clientId,
        actorId,
        action: "CSV_METRICS_IMPORTED",
        entityType: "Client",
        entityId: clientId,
        after: { rowCount: rows.length, created, updated, skipped, errors: errorCount },
      },
    });
  }, { timeout: 60_000 });

  return { total: rows.length, created, updated, skipped, errors: errorCount, rows: results };
}

// ---------------------------------------------------------------------------
// CSV template generation
// ---------------------------------------------------------------------------

function currentMonthStart() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function currentMonthEnd() {
  const now = new Date();
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth() + 1).padStart(2, "0")}-${String(lastDay.getUTCDate()).padStart(2, "0")}`;
}

export function generateCsvTemplate(): string {
  const header = "metric_key,period_start,period_end,value,source,note";
  const start = currentMonthStart();
  const end = currentMonthEnd();
  const rows = ALL_METRIC_DEFINITIONS.map((definition) =>
    `${definition.key},${start},${end},,${definition.source},`
  );
  return [header, ...rows].join("\n");
}
