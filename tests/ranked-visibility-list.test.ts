import { describe, expect, it } from "vitest";
import { formatChange, getPeriodValues } from "../components/ranked-visibility-list.logic";

describe("ranked visibility period calculations", () => {
  it("compares the latest month with the preceding month", () => {
    expect(getPeriodValues([{ label: "Oct", value: 60 }, { label: "Nov", value: 68 }], 0, "month")).toEqual({ current: 68, previous: 60, comparisonAvailable: true });
    expect(formatChange(68, 60).label).toBe("+13.3%");
  });

  it("compares complete trailing quarters", () => {
    const history = [
      { label: "Apr", value: 10 }, { label: "May", value: 12 }, { label: "Jun", value: 14 },
      { label: "Jul", value: 16 }, { label: "Aug", value: 18 }, { label: "Sep", value: 20 },
    ];
    expect(getPeriodValues(history, 0, "quarter")).toEqual({ current: 54, previous: 36, comparisonAvailable: true });
  });

  it("does not invent a comparison without a complete previous period", () => {
    expect(getPeriodValues([{ label: "Oct", value: 100 }, { label: "Nov", value: 120 }], 0, "quarter")).toEqual({ current: 220, previous: null, comparisonAvailable: false });
    expect(formatChange(220, null)).toEqual({ label: "—", direction: "neutral", percentage: null });
  });
});
