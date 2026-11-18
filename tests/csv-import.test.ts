import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { ALL_METRIC_DEFINITIONS, generateCsvTemplate, generateXlsxTemplate, parseCsv, parseXlsx } from "../lib/csv-import";

describe("CSV metric import", () => {
  it("parses supported aliases, normalizes source, and preserves quoted notes", () => {
    const result = parseCsv([
      "metric,periodstart,periodend,value,source,note",
      "ga4-sessions,2026-11-01,2026-11-30,1234,ga4,\"November, approved\"",
    ].join("\n"));

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([{
      line: 2,
      metricKey: "ga4-sessions",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      value: "1234",
      source: "GA4",
      note: "November, approved",
    }]);
  });

  it("ignores unused rows in the generated template", () => {
    const template = generateCsvTemplate();
    const result = parseCsv(template);

    expect(ALL_METRIC_DEFINITIONS).toHaveLength(26);
    expect(template.split("\n")).toHaveLength(27);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("rejects unknown metric keys", () => {
    const result = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "ga4-sessons,2026-11-01,2026-11-30,10,GA4,typo",
    ].join("\n"));

    expect(result.rows).toEqual([]);
    expect(result.errors[0]?.field).toBe("metric_key");
    expect(result.errors[0]?.message).toContain("Unknown metric key");
  });

  it("rejects impossible calendar dates", () => {
    const result = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "ga4-sessions,2026-02-31,2026-03-31,10,GA4,invalid date",
    ].join("\n"));

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([{ line: 2, field: "period_start", message: "Invalid start date." }]);
  });

  it("rejects duplicate metric-period-source rows", () => {
    const result = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "ga4-sessions,2026-11-01,2026-11-30,10,GA4,first",
      "ga4-sessions,2026-11-01,2026-11-30,20,GA4,second",
    ].join("\n"));

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([{ line: 3, field: "metric_key", message: "Duplicate metric, period, and source row." }]);
  });

  it("normalizes visible percentage input and rejects ambiguous decimal CTR input", () => {
    const visiblePercent = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "gsc-ctr,2026-11-01,2026-11-30,1.7%,GSC,approved",
    ].join("\n"), { screen: "website" });
    expect(visiblePercent.errors).toEqual([]);
    expect(visiblePercent.rows[0]?.value).toBe("1.7");

    const decimalPercent = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "gsc-ctr,2026-11-01,2026-11-30,0.017,GSC,ambiguous",
    ].join("\n"), { screen: "website" });
    expect(decimalPercent.rows).toEqual([]);
    expect(decimalPercent.errors[0]?.message).toContain("percentage points");
  });

  it("keeps screen imports scoped to the selected catalog", () => {
    const result = parseCsv([
      "metric_key,period_start,period_end,value,source,note",
      "ga4-sessions,2026-10-01,2026-10-31,1234,GA4,",
    ].join("\n"), { screen: "website" });

    expect(result.rows).toEqual([]);
    expect(result.errors[0]?.message).toContain("not part of the Website GSC import");
  });

  it("creates a focused Excel workbook with a separate instructions sheet", () => {
    const workbook = generateXlsxTemplate("website", { includePreviousPeriod: true });
    const result = parseXlsx(workbook, { screen: "website" });

    expect(workbook.length).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("imports all six Website GSC fields from a filled workbook", () => {
    const workbook = XLSX.read(generateXlsxTemplate("website", { includePreviousPeriod: true }), { type: "buffer", raw: false });
    const sheet = workbook.Sheets["Website GSC"];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as string[][];
    const values: Record<string, string> = {
      "ga4-organic-sessions": "8426",
      "gsc-clicks": "2100",
      "gsc-impressions": "124800",
      "gsc-ctr": "1.7",
      "gsc-position": "7.4",
      "kw-top10": "68",
    };
    for (let index = 1; index < rows.length; index += 1) rows[index][4] = values[rows[index][0]] ?? "";
    workbook.Sheets["Website GSC"] = XLSX.utils.aoa_to_sheet(rows);

    const result = parseXlsx(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { screen: "website" });
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(12);
    expect([...new Set(result.rows.map((row) => row.metricKey))]).toEqual([
      "ga4-organic-sessions",
      "gsc-clicks",
      "gsc-impressions",
      "gsc-ctr",
      "gsc-position",
      "kw-top10",
    ]);
    expect(result.rows.find((row) => row.metricKey === "gsc-ctr")?.value).toBe("1.7");
  });
});
