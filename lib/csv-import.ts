import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { GOOGLE_METRIC_DEFINITIONS } from "./google/provision";

type Database = PrismaClient | Prisma.TransactionClient;

const VALID_SOURCES = ["MANUAL", "GSC", "GA4", "GBP", "DATAFORSEO"] as const;
type ValidSource = (typeof VALID_SOURCES)[number];

export type ImportScreen = "overview" | "analytics" | "website" | "gbp" | "all";

export const IMPORT_SCREEN_CONFIG: Record<ImportScreen, { label: string; description: string; metricKeys: string[] }> = {
  overview: {
    label: "Overview",
    description: "The client overview cards and summary trends.",
    metricKeys: ["ga4-organic-sessions", "gsc-clicks", "gsc-impressions", "gsc-ctr", "gsc-position", "kw-top10", "gbp-calls", "gbp-views", "gbp-website-clicks", "gbp-directions", "gbp-reviews"],
  },
  analytics: {
    label: "Analytics",
    description: "All Google Analytics 4 cards and monthly rows.",
    metricKeys: GOOGLE_METRIC_DEFINITIONS.filter((definition) => definition.source === "GA4").map((definition) => definition.key),
  },
  website: {
    label: "Website GSC",
    description: "Organic traffic, Search Console visibility, and top-10 keyword fields.",
    metricKeys: ["ga4-organic-sessions", "gsc-clicks", "gsc-impressions", "gsc-ctr", "gsc-position", "kw-top10"],
  },
  gbp: {
    label: "GBP",
    description: "Google Business Profile Search and Maps performance fields.",
    metricKeys: ["gbp-calls", "gbp-views", "gbp-website-clicks", "gbp-directions", "gbp-reviews"],
  },
  all: {
    label: "All reporting screens",
    description: "Every supported metric across the client portal.",
    metricKeys: [],
  },
};

export function normalizeImportScreen(value?: string | null): ImportScreen {
  if (value === "gsc" || value === "website-seo") return "website";
  if (value === "overview" || value === "analytics" || value === "website" || value === "gbp" || value === "all") return value;
  return "all";
}

function metricAllowedForScreen(metricKey: string, screen: ImportScreen) {
  return screen === "all" || IMPORT_SCREEN_CONFIG[screen].metricKeys.includes(metricKey);
}

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
  WEBSITE: { name: "Website GSC", position: 1 },
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

function importUnit(valueFormat: string) {
  if (valueFormat === "PERCENT") return "%";
  if (valueFormat === "DECIMAL") return "number";
  if (valueFormat === "RANK") return "count";
  return "whole number";
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

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

function parseImportNumber(rawValue: string, valueFormat: string): { value: number | null; error: string | null } {
  const trimmed = rawValue.trim().replace(/,/g, "");
  const hasPercentSign = trimmed.endsWith("%");
  const numericText = hasPercentSign ? trimmed.slice(0, -1).trim() : trimmed;
  const numericValue = Number(numericText);
  if (!numericText || !Number.isFinite(numericValue)) return { value: null, error: "Value must be a valid number." };

  if (valueFormat === "PERCENT") {
    if (!hasPercentSign && numericValue > 0 && numericValue < 1) return { value: null, error: "Enter CTR as percentage points, for example 1.7 for 1.7%, not decimal form such as 0.017." };
    if (numericValue < 0 || numericValue > 100) return { value: null, error: "Percentage values must be between 0 and 100." };
  }
  if (["INTEGER", "RANK"].includes(valueFormat) && (!Number.isInteger(numericValue) || numericValue < 0)) return { value: null, error: "This field must be a non-negative whole number." };
  if (valueFormat === "DECIMAL" && numericValue < 0) return { value: null, error: "This field must be zero or greater." };

  return { value: numericValue, error: null };
}

export function parseCsv(text: string, options: { screen?: ImportScreen } = {}): { rows: CsvRow[]; errors: CsvRowError[] } {
  const screen = normalizeImportScreen(options.screen);
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
    if (definition && !metricAllowedForScreen(metricKey, screen)) {
      errors.push({ line: lineNumber, field: "metric_key", message: metricKey + " is not part of the " + IMPORT_SCREEN_CONFIG[screen].label + " import. Download the " + IMPORT_SCREEN_CONFIG[screen].label + " template for this screen." });
      continue;
    }
    if (!definition) { errors.push({ line: lineNumber, field: "metric_key", message: `Unknown metric key: ${metricKey}. Download a current template or use a supported metric key.` }); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) { errors.push({ line: lineNumber, field: "period_start", message: "Period start must be YYYY-MM-DD." }); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) { errors.push({ line: lineNumber, field: "period_end", message: "Period end must be YYYY-MM-DD." }); continue; }
    const parsedValue = parseImportNumber(value, definition.valueFormat);
    if (parsedValue.error || parsedValue.value === null) { errors.push({ line: lineNumber, field: "value", message: parsedValue.error ?? "Value must be a valid number." }); continue; }

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

    rows.push({ line: lineNumber, metricKey, periodStart, periodEnd, value: String(parsedValue.value), source: effectiveSource, note });
  }

  return { rows, errors };
}

/** Parse every data worksheet in an Excel workbook using the same validation as CSV. */
export function parseXlsx(buffer: ArrayBuffer | Uint8Array, options: { screen?: ImportScreen } = {}): { rows: CsvRow[]; errors: CsvRowError[] } {
  try {
    const workbook = XLSX.read(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer), { type: "array", cellDates: false, raw: false });
    const dataSheets = workbook.SheetNames.filter((sheetName) => sheetName.toLowerCase() !== "instructions");
    if (!dataSheets.length) return { rows: [], errors: [{ line: 1, field: "file", message: "The Excel workbook must contain at least one data worksheet." }] };
    const results = dataSheets.map((sheetName) => parseCsv(XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false }), options));
    return {
      rows: results.flatMap((result) => result.rows),
      errors: results.flatMap((result) => result.errors),
    };
  } catch {
    return { rows: [], errors: [{ line: 1, field: "file", message: "The Excel workbook could not be read. Use a valid .xlsx file." }] };
  }
}

export async function parseImportFile(fileName: string, buffer: ArrayBuffer, options: { screen?: ImportScreen } = {}) {
  if (fileName.toLowerCase().endsWith(".xlsx")) return parseXlsx(buffer, options);
  return { rows: [], errors: [{ line: 1, field: "file", message: "Only .xlsx Excel workbooks are supported." }] };
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
  transaction?: Prisma.TransactionClient,
): Promise<ImportSummary> {
  const results: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errorCount = 0;

  const executeImport = async (transactionClient: Prisma.TransactionClient) => {
    for (const row of rows) {
      try {
        const { metricId, source } = await ensureSectionAndMetric(clientId, row.metricKey, row.source as ValidSource | "", transactionClient);
        const periodStart = new Date(`${row.periodStart}T00:00:00.000Z`);
        const periodEnd = new Date(`${row.periodEnd}T23:59:59.999Z`);
        const numericValue = Number(row.value);

        // Check for existing manual override
        const existing = await transactionClient.metricValue.findUnique({
          where: { metricId_periodStart_periodEnd_source_dataOrigin: { metricId, periodStart, periodEnd, source, dataOrigin: "MANAGED" } },
          select: { id: true, isOverride: true },
        });

        if (existing?.isOverride) {
          results.push({ line: row.line, metricKey: row.metricKey, outcome: "overridden", message: "Skipped — manual override exists." });
          skipped++;
          continue;
        }

        await transactionClient.metricValue.upsert({
          where: { metricId_periodStart_periodEnd_source_dataOrigin: { metricId, periodStart, periodEnd, source, dataOrigin: "MANAGED" } },
          update: { value: new Prisma.Decimal(numericValue), note: row.note || null, isOverride: false, dataOrigin: "MANAGED" },
          create: { metricId, periodStart, periodEnd, value: new Prisma.Decimal(numericValue), source, note: row.note || null, dataOrigin: "MANAGED" },
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
    await transactionClient.auditLog.create({
      data: {
        clientId,
        actorId,
        action: "EXCEL_METRICS_IMPORTED",
        entityType: "Client",
        entityId: clientId,
        after: { rowCount: rows.length, created, updated, skipped, errors: errorCount },
      },
    });
  };

  // Process in a single transaction with a generous timeout for large imports.
  // The optional transaction is used by integration tests so their writes can
  // be rolled back without changing a real client workspace.
  if (transaction) {
    await executeImport(transaction);
  } else {
    const { prisma } = await import("@ai-rankers/db");
    await prisma.$transaction(executeImport, { timeout: 60_000 });
  }

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

function monthWindow(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  return {
    start: start.getUTCFullYear() + "-" + String(start.getUTCMonth() + 1).padStart(2, "0") + "-01",
    end: end.getUTCFullYear() + "-" + String(end.getUTCMonth() + 1).padStart(2, "0") + "-" + String(end.getUTCDate()).padStart(2, "0"),
  };
}

export function generateCsvTemplate(screen: ImportScreen = "all", options: { includePreviousPeriod?: boolean } = {}): string {
  const header = "metric_key,metric_name,period_start,period_end,value,source,unit,note";
  const definitions = screen === "all"
    ? ALL_METRIC_DEFINITIONS
    : IMPORT_SCREEN_CONFIG[screen].metricKeys.map((key) => METRIC_BY_KEY.get(key)).filter((definition): definition is (typeof ALL_METRIC_DEFINITIONS)[number] => Boolean(definition));
  const windows = options.includePreviousPeriod ? [monthWindow(-1), monthWindow(0)] : [{ start: currentMonthStart(), end: currentMonthEnd() }];
  const rows = windows.flatMap(({ start, end }) => definitions.map((definition) => [definition.key, definition.name, start, end, "", definition.source, importUnit(definition.valueFormat), ""].map(csvCell).join(",")));
  return [header, ...rows].join("\n");
}

export function generateXlsxTemplate(screen: ImportScreen = "all", options: { includePreviousPeriod?: boolean } = {}): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const screens: ImportScreen[] = screen === "all" ? ["overview", "analytics", "website", "gbp"] : [screen];
  const selectedConfig = IMPORT_SCREEN_CONFIG[screen];
  const instructionRows = [
    ["AI Rankers", "Client reporting import workbook"],
    ["Selected scope", selectedConfig.label],
    ["Purpose", selectedConfig.description],
    ["Step 1", "Open the screen tab and enter values only in the blank value column."],
    ["Step 2", "Keep metric_key, metric_name, period dates, source, and unit unchanged."],
    ["Step 3", "Save the workbook as .xlsx and upload it from the matching admin screen."],
    ["Step 4", "After a successful import, the client portal uses Managed DB data so the imported values are visible."],
    ["Important", "Blank value rows are skipped. Use 1.7 for 1.7% CTR. Counts must be whole numbers; average position may use decimals."],
    [],
    ["Import contract", "Required", "What to enter", "Example"],
    ["metric_key", "Yes", "System key. Do not edit.", "gsc-clicks"],
    ["metric_name", "Reference", "Human-readable field name. Do not edit.", "Search clicks"],
    ["period_start", "Yes", "First day of the reporting period in YYYY-MM-DD format.", "2026-11-01"],
    ["period_end", "Yes", "Last day of the reporting period in YYYY-MM-DD format.", "2026-11-30"],
    ["value", "Yes", "Enter the approved numeric result. This is the only required field you normally change.", "2100"],
    ["source", "Reference", "Provider label. Do not edit.", "GSC"],
    ["unit", "Reference", "Expected unit for the value.", "whole number"],
    ["note", "Optional", "Optional context saved with the reporting value.", "November approved"],
    [],
    ["Website GSC field guide", "Source", "Unit", "Example", "Entry rule"],
    ["Organic traffic", "GA4", "whole number", "8426", "Sessions attributed to organic search."],
    ["Search clicks", "GSC", "whole number", "2100", "Search result clicks."],
    ["Search impressions", "GSC", "whole number", "124800", "Search result impressions."],
    ["Search CTR", "GSC", "%", "1.7", "Enter percentage points, not 0.017."],
    ["Average position", "GSC", "number", "7.4", "Lower position is better; decimals are allowed."],
    ["Keywords in top 10", "DATAFORSEO", "count", "68", "Tracked keywords ranking in positions 1–10."],
  ];
  const instructions = XLSX.utils.aoa_to_sheet(instructionRows);
  instructions["!cols"] = [{ wch: 24 }, { wch: 92 }, { wch: 22 }, { wch: 22 }, { wch: 48 }];
  instructions["!rows"] = [{ hpt: 26 }, { hpt: 22 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  for (const currentScreen of screens) {
    const rows = generateCsvTemplate(currentScreen, options).split("\n").map((line) => parseCsvLine(line));
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const dataRowCount = rows.length;
    sheet["!cols"] = [{ wch: 26 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 15 }, { wch: 14 }, { wch: 42 }];
    sheet["!rows"] = [{ hpt: 24 }];
    sheet["!autofilter"] = { ref: `A1:H${dataRowCount}` };
    XLSX.utils.book_append_sheet(workbook, sheet, IMPORT_SCREEN_CONFIG[currentScreen].label.slice(0, 31));
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
}
