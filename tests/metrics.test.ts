import { describe, expect, it } from "vitest";
import { demoMetrics, formatMetricTrend, getMetricTrend } from "@ai-rankers/core";

describe("metric trends", () => {
  it("calculates the latest period change", () => {
    expect(getMetricTrend(demoMetrics.topTen)).toBeCloseTo(13.333, 2);
  });

  it("formats positive and negative changes", () => {
    expect(formatMetricTrend(48.6)).toBe("+48.6%");
    expect(formatMetricTrend(-12.2)).toBe("-12.2%");
  });
});
