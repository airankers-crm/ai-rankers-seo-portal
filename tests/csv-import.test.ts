import { describe, expect, it } from "vitest";
import { ALL_METRIC_DEFINITIONS, generateCsvTemplate, parseCsv } from "../lib/csv-import";

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
});
