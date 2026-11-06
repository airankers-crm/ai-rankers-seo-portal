import type { MetricHistoryPoint } from "@ai-rankers/core";

export type RankingPeriod = "month" | "quarter";

export type PeriodValues = {
  current: number;
  previous: number | null;
  comparisonAvailable: boolean;
};

export function getPeriodValues(history: MetricHistoryPoint[], fallbackValue: number, period: RankingPeriod): PeriodValues {
  if (period === "month") {
    const current = history.at(-1)?.value ?? fallbackValue;
    const previous = history.at(-2)?.value ?? null;
    return { current, previous, comparisonAvailable: previous !== null };
  }

  const currentPoints = history.slice(-3);
  const previousPoints = history.slice(-6, -3);
  const current = currentPoints.length > 0 ? currentPoints.reduce((total, point) => total + point.value, 0) : fallbackValue;
  const previous = previousPoints.length === 3 ? previousPoints.reduce((total, point) => total + point.value, 0) : null;
  return { current, previous, comparisonAvailable: previous !== null };
}

export function formatChange(current: number, previous: number | null) {
  if (previous === null) return { label: "—", direction: "neutral" as const, percentage: null };
  if (previous === 0) return { label: "New", direction: "positive" as const, percentage: null };
  const percentage = ((current - previous) / previous) * 100;
  return {
    label: `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`,
    direction: percentage >= 0 ? "positive" as const : "negative" as const,
    percentage,
  };
}

export function formatMetricValue(value: number, format: "integer" | "compact") {
  if (format === "compact" && Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}
