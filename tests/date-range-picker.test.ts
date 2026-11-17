import { describe, expect, it } from "vitest";
import { dateRangePresets, getDefaultDateRange, getPresetRange } from "../components/date-range-picker";

function dateParts(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

describe("shared portal date range presets", () => {
  const anchor = new Date(2026, 10, 17, 12);

  it("exposes the concise preset order used throughout the portal", () => {
    expect(dateRangePresets).toEqual([
      "Custom",
      "Today",
      "Yesterday",
      "Last 3 days",
      "Last 1 week",
      "Last 3 weeks",
      "Last 1 month",
      "Last 6 months",
      "Last 1 year",
    ]);
  });

  it.each([
    ["Today", [2026, 11, 17], [2026, 11, 17]],
    ["Yesterday", [2026, 11, 16], [2026, 11, 16]],
    ["Last 3 days", [2026, 11, 15], [2026, 11, 17]],
    ["Last 1 week", [2026, 11, 11], [2026, 11, 17]],
    ["Last 3 weeks", [2026, 10, 28], [2026, 11, 17]],
    ["Last 1 month", [2026, 10, 19], [2026, 11, 17]],
    ["Last 6 months", [2026, 6, 1], [2026, 11, 17]],
    ["Last 1 year", [2025, 11, 18], [2026, 11, 17]],
  ] as const)("resolves %s inclusively", (preset, expectedStart, expectedEnd) => {
    const range = getPresetRange(preset, anchor);
    expect(dateParts(range.start)).toEqual(expectedStart);
    expect(dateParts(range.end)).toEqual(expectedEnd);
  });

  it("uses one month as the default reporting window", () => {
    expect(getDefaultDateRange().label).toBe("Last 1 month");
  });
});
