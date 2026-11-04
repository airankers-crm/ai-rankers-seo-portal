import type { DemoMetric } from "./types";

export function getMetricTrend(metric: DemoMetric): number {
  if (metric.history.length < 2) return 0;
  const previous = metric.history[metric.history.length - 2].value;
  if (previous === 0) return 0;
  return ((metric.value - previous) / previous) * 100;
}

export function formatMetricTrend(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}
