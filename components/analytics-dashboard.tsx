"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { CheckCircle2, Clock3, Table2, UsersRound } from "lucide-react";
import { AppShell } from "./app-shell";
import { AnalyticsRealtime } from "./analytics-realtime";
import { DateRangePicker, getPresetRange, type DateRangeSelection } from "./date-range-picker";

export type AnalyticsMetric = {
  key: string;
  label: string;
  description: string;
  value: number | null;
  previousValue: number | null;
  format: "INTEGER" | "PERCENT";
  source: string;
};

export type AnalyticsRow = {
  periodStart: string;
  periodLabel: string;
  activeUsers: number | null;
  sessions: number | null;
  organicSessions: number | null;
  views: number | null;
  engagedSessions: number | null;
  engagementRate: number | null;
  eventCount: number | null;
  keyEvents: number | null;
  phoneClicks: number | null;
  formSubmissions: number | null;
  quoteRequests: number | null;
};

type AnalyticsViewKey = "activeUsers" | "sessions" | "organicSessions" | "views" | "engagedSessions" | "engagementRate" | "eventCount" | "keyEvents" | "phoneClicks" | "formSubmissions" | "quoteRequests";
type AnalyticsTrendSummary = { activeUsers: number; sessions: number; eventCount: number; keyEvents: number; views: number };
type AnalyticsTrendPoint = AnalyticsTrendSummary & { date: string };
type AnalyticsTrendResult = { current: { points: AnalyticsTrendPoint[]; summary: AnalyticsTrendSummary }; comparison: { points: AnalyticsTrendPoint[]; summary: AnalyticsTrendSummary } | null; warnings: string[] };
type AnalyticsTrendStatus = "idle" | "loading" | "ready" | "empty" | "error";
type DateRangeKey = "custom" | "today" | "yesterday" | "last-3-days" | "last-1-week" | "last-3-weeks" | "last-1-month" | "last-6-months" | "last-1-year";
type CompareKey = "none" | "previous-period" | "previous-year";

const dateRangeOptions: Array<{ key: DateRangeKey; label: string; days: number }> = [
  { key: "custom", label: "Custom", days: 30 },
  { key: "today", label: "Today", days: 1 },
  { key: "yesterday", label: "Yesterday", days: 1 },
  { key: "last-3-days", label: "Last 3 days", days: 3 },
  { key: "last-1-week", label: "Last 1 week", days: 7 },
  { key: "last-3-weeks", label: "Last 3 weeks", days: 21 },
  { key: "last-1-month", label: "Last 1 month", days: 30 },
  { key: "last-6-months", label: "Last 6 months", days: 183 },
  { key: "last-1-year", label: "Last 1 year", days: 365 },
];
const compareOptions: Array<{ key: CompareKey; label: string }> = [
  { key: "none", label: "No comparison" },
  { key: "previous-period", label: "Previous period" },
  { key: "previous-year", label: "Previous year" },
];
const zeroBars = Array.from({ length: 12 }, () => 0);
const sumMetricKeys = new Set<AnalyticsViewKey>(["sessions", "organicSessions", "views", "engagedSessions", "eventCount", "keyEvents", "phoneClicks", "formSubmissions", "quoteRequests"]);

function getAnalyticsDefaultDateRange(): DateRangeSelection {
  const preset = "Last 6 months" as const;
  const { start, end } = getPresetRange(preset, new Date());
  return { label: preset, start, end, compare: "None" };
}

function compact(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();
}

function analyticsTableValue(value: number | null, format: AnalyticsMetric["format"]) {
  if (value === null || value === undefined) return "—";
  return format === "PERCENT" ? `${value.toFixed(1)}%` : value.toLocaleString();
}

function MiniBars({ values = zeroBars }: { values?: number[] }) {
  return <span className="analytics-reference-bars" aria-hidden="true">{values.map((value, index) => <i key={`${value}-${index}`} style={{ height: `${value === 0 ? 0 : Math.max(7, value)}%` }} />)}</span>;
}

function ReferenceTrendChart({ values, labels, comparisonValues, tooltipValues }: { values: number[]; labels: string[]; comparisonValues?: number[]; tooltipValues?: number[] }) {
  const width = 720;
  const height = 205;
  const paddingX = 10;
  const paddingY = 16;
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; label: string; value: number; x: number; y: number } | null>(null);
  const coordinateFor = (value: number, index: number, count = values.length) => ({
    x: paddingX + (index / Math.max(count - 1, 1)) * (width - paddingX * 2),
    y: height - paddingY - (value / 100) * (height - paddingY * 2),
  });
  const pointsFor = (series: number[]) => series.map((value, index) => {
    const { x, y } = coordinateFor(value, index, series.length);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const points = pointsFor(values);
  const comparisonPoints = comparisonValues?.length ? pointsFor(comparisonValues) : null;
  const handleChartMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const chartX = (relativeX / Math.max(bounds.width, 1)) * width;
    const index = Math.round(((chartX - paddingX) / (width - paddingX * 2)) * (values.length - 1));
    const safeIndex = Math.min(values.length - 1, Math.max(0, index));
    const value = values[safeIndex] ?? 0;
    const tooltipValue = tooltipValues?.[safeIndex] ?? value;
    const { x, y } = coordinateFor(value, safeIndex);
    setHoveredPoint({ index: safeIndex, label: labels[safeIndex] ?? `Point ${safeIndex + 1}`, value: tooltipValue, x, y });
  };
  return <div className="analytics-reference-chart" role="img" aria-label="Sessions over time chart" onMouseMove={handleChartMove} onMouseLeave={() => setHoveredPoint(null)}><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><defs><linearGradient id="analyticsReferenceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2167d9" stopOpacity=".28" /><stop offset="100%" stopColor="#2167d9" stopOpacity=".03" /></linearGradient></defs>{[0, 1, 2, 3, 4].map((line) => <line key={line} x1={paddingX} x2={width - paddingX} y1={paddingY + (line / 4) * (height - paddingY * 2)} y2={paddingY + (line / 4) * (height - paddingY * 2)} className="analytics-reference-grid-line" />)}<polyline points={`${paddingX},${height - paddingY} ${points} ${width - paddingX},${height - paddingY}`} fill="url(#analyticsReferenceFill)" stroke="none" />{comparisonPoints ? <polyline points={comparisonPoints} fill="none" className="analytics-reference-comparison-line" /> : null}<polyline points={points} fill="none" className="analytics-reference-line" />{values.map((value, index) => { const { x, y } = coordinateFor(value, index); const label = labels[index] ?? `Point ${index + 1}`; const tooltipValue = tooltipValues?.[index] ?? value; return <g key={`${label}-${index}`} tabIndex={0} onMouseEnter={() => setHoveredPoint({ index, label, value: tooltipValue, x, y })} onFocus={() => setHoveredPoint({ index, label, value: tooltipValue, x, y })} onBlur={() => setHoveredPoint(null)}><title>{`${label}: ${tooltipValue.toLocaleString()}`}</title><circle cx={x} cy={y} r="8" className="analytics-reference-point-hit" /><circle cx={x} cy={y} r="4.5" className="analytics-reference-point" /></g>; })}</svg><div className="analytics-reference-axis">{labels.filter((_, index) => labels.length <= 6 || index % Math.ceil(labels.length / 6) === 0 || index === labels.length - 1).map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>{hoveredPoint ? <div className="analytics-reference-tooltip" style={{ left: `${(hoveredPoint.x / width) * 100}%`, top: `${(hoveredPoint.y / height) * 100}%` }}><strong>{hoveredPoint.label}</strong><span>Sessions: {hoveredPoint.value.toLocaleString()}</span></div> : null}</div>;
}

function labelsForRange(range: DateRangeKey) {
  if (range === "last-6-months" || range === "last-1-year") return ["Start", "", "", "", "", "Now"];
  if (range === "today") return ["12 AM", "", "", "", "", "Now"];
  if (range === "yesterday") return ["12 AM", "", "", "", "", "11 PM"];
  return ["Start", "", "", "", "", "Now"];
}

function normalizeSeries(values: number[]) {
  if (!values.length || Math.max(...values) === 0) return values.map(() => 0);
  if (values.length === 1) return [65, 65];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return values.map(() => 58);
  return values.map((value) => 25 + ((value - minimum) / (maximum - minimum)) * 65);
}

function dateRangeKey(selection: DateRangeSelection): DateRangeKey {
  const labels: Record<string, DateRangeKey> = {
    Today: "today", Yesterday: "yesterday", "Last 3 days": "last-3-days", "Last 1 week": "last-1-week", "Last 3 weeks": "last-3-weeks", "Last 1 month": "last-1-month", "Last 6 months": "last-6-months", "Last 1 year": "last-1-year",
  };
  return labels[selection.label] ?? "custom";
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function rowsInRange(rows: AnalyticsRow[], start: Date, end: Date) {
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  return rows.filter((row) => row.periodStart.slice(0, 10) >= startKey && row.periodStart.slice(0, 10) <= endKey);
}

function comparisonDateWindow(start: Date, end: Date, compare: CompareKey) {
  if (compare === "none") return null;
  if (compare === "previous-year") {
    const comparisonStart = new Date(start);
    const comparisonEnd = new Date(end);
    comparisonStart.setFullYear(comparisonStart.getFullYear() - 1);
    comparisonEnd.setFullYear(comparisonEnd.getFullYear() - 1);
    return { start: comparisonStart, end: comparisonEnd };
  }
  const span = end.getTime() - start.getTime();
  const comparisonEnd = new Date(start.getTime() - 86_400_000);
  return { start: new Date(comparisonEnd.getTime() - span), end: comparisonEnd };
}

function queryDate(date: Date) {
  return dateKey(date);
}

function liveSummaryValueForPoint(key: AnalyticsViewKey, point: AnalyticsTrendPoint) {
  if (key === "activeUsers") return point.activeUsers;
  if (key === "sessions") return point.sessions;
  if (key === "eventCount") return point.eventCount;
  if (key === "keyEvents") return point.keyEvents;
  if (key === "views") return point.views;
  return null;
}

export function AnalyticsDashboard({ clientName, brandMark, brandAccent, metrics, rows, isDraftPreview = false, showRealtime = true }: { clientName: string; brandMark: string; brandAccent: string; metrics: AnalyticsMetric[]; rows: AnalyticsRow[]; isDraftPreview?: boolean; showRealtime?: boolean }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getAnalyticsDefaultDateRange);
  const [trendResult, setTrendResult] = useState<AnalyticsTrendResult | null>(null);
  const [trendStatus, setTrendStatus] = useState<AnalyticsTrendStatus>("idle");
  const range = dateRangeKey(dateRange);
  const compare: CompareKey = dateRange.compare === "Previous period" ? "previous-period" : dateRange.compare === "Previous year" ? "previous-year" : "none";
  const comparisonWindow = useMemo(() => comparisonDateWindow(dateRange.start, dateRange.end, compare), [compare, dateRange.end, dateRange.start]);

  useEffect(() => {
    if (isDraftPreview) return;
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => {
      setTrendStatus("loading");
      const params = new URLSearchParams({ start: queryDate(dateRange.start), end: queryDate(dateRange.end) });
      if (comparisonWindow) {
        params.set("comparisonStart", queryDate(comparisonWindow.start));
        params.set("comparisonEnd", queryDate(comparisonWindow.end));
      }
      void fetch(`/api/portal/analytics/trend?${params.toString()}`, { cache: "no-store", signal: controller.signal }).then(async (response) => {
        if (response.status === 409) {
          setTrendResult(null);
          setTrendStatus("empty");
          return;
        }
        if (!response.ok) throw new Error("Analytics trend request failed");
        const payload = await response.json() as { data?: AnalyticsTrendResult | null };
        setTrendResult(payload.data ?? null);
        setTrendStatus(payload.data ? "ready" : "empty");
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTrendStatus("error");
      });
    }, 0);
    return () => {
      window.clearTimeout(initialLoad);
      controller.abort();
    };
  }, [comparisonWindow, dateRange.end, dateRange.start, isDraftPreview]);

  const displayedTrendResult = isDraftPreview ? null : trendResult;
  const displayedTrendStatus = isDraftPreview ? "idle" : trendStatus;

  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.key, metric])), [metrics]);
  const connectedMetricCount = metrics.filter((metric) => metric.value !== null).length;
  const hasReportingData = connectedMetricCount > 0 || rows.length > 0;
  const selectedRange = dateRangeOptions.find((option) => option.key === range) ?? dateRangeOptions[6];
  const visibleRows = useMemo(() => rowsInRange(rows, dateRange.start, dateRange.end), [dateRange.end, dateRange.start, rows]);
  const comparisonRows = useMemo(() => {
    if (compare === "none") return [];
    if (compare === "previous-year") {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      start.setFullYear(start.getFullYear() - 1);
      end.setFullYear(end.getFullYear() - 1);
      return rowsInRange(rows, start, end);
    }
    const span = dateRange.end.getTime() - dateRange.start.getTime();
    const end = new Date(dateRange.start.getTime() - 86_400_000);
    const start = new Date(end.getTime() - span);
    return rowsInRange(rows, start, end);
  }, [compare, dateRange.end, dateRange.start, rows]);

  const valueForRows = (key: AnalyticsViewKey, sourceRows: AnalyticsRow[]) => {
    const values = sourceRows.map((row) => row[key]).filter((value): value is number => value !== null);
    if (!values.length) return 0;
    if (sumMetricKeys.has(key)) return values.reduce((total, value) => total + value, 0);
    if (key === "engagementRate") return values.reduce((total, value) => total + value, 0) / values.length;
    return values[values.length - 1] ?? 0;
  };
  const liveSummaryValue = (key: AnalyticsViewKey) => {
    const summary = displayedTrendResult?.current.summary;
    if (!summary) return null;
    if (key === "activeUsers") return summary.activeUsers;
    if (key === "sessions") return summary.sessions;
    if (key === "eventCount") return summary.eventCount;
    if (key === "keyEvents") return summary.keyEvents;
    if (key === "views") return summary.views;
    return null;
  };
  const valueFor = (key: AnalyticsViewKey) => {
    if (visibleRows.length > 0) return valueForRows(key, visibleRows);
    const liveValue = displayedTrendStatus === "ready" ? liveSummaryValue(key) : null;
    if (liveValue !== null) return liveValue;
    if (rows.length > 0) return null;
    return metricMap.get(key)?.value ?? null;
  };
  const liveTrendPoints = displayedTrendStatus === "ready" ? displayedTrendResult?.current.points ?? [] : [];
  const fallbackTrendValues = visibleRows.map((row) => row.sessions ?? row.organicSessions ?? 0);
  const rawTrendSource = liveTrendPoints.length ? liveTrendPoints.map((point) => point.sessions) : fallbackTrendValues;
  const rawTrendValues = rawTrendSource.length === 1 ? [rawTrendSource[0], rawTrendSource[0]] : rawTrendSource.length > 1 ? rawTrendSource : Array.from({ length: 6 }, () => 0);
  const trendValues = normalizeSeries(rawTrendValues);
  const liveTrendLabels = liveTrendPoints.map((point) => new Date(`${point.date}T00:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const fallbackTrendLabels = visibleRows.map((row) => row.periodLabel);
  const trendLabels = rawTrendSource.length === 1 ? [liveTrendLabels[0] ?? fallbackTrendLabels[0] ?? "Start", ""] : rawTrendSource.length > 1 ? (liveTrendLabels.length ? liveTrendLabels : fallbackTrendLabels) : labelsForRange(range);
  const rawComparisonPoints = displayedTrendStatus === "ready" ? displayedTrendResult?.comparison?.points ?? [] : [];
  const rawComparison = rawComparisonPoints.length ? rawComparisonPoints.map((point) => point.sessions) : comparisonRows.map((row) => row.sessions ?? row.organicSessions ?? 0);
  const comparisonValues = rawComparison.length ? normalizeSeries(rawComparison.length === 1 ? [rawComparison[0], rawComparison[0]] : rawComparison) : undefined;
  const sparkline = (key: AnalyticsViewKey) => {
    if (liveTrendPoints.length) {
      const values = liveTrendPoints.map((point) => liveSummaryValueForPoint(key, point)).filter((value): value is number => value !== null);
      return values.length ? normalizeSeries(values.length === 1 ? [values[0], values[0], values[0], values[0]] : values) : zeroBars;
    }
    const values = visibleRows.map((row) => row[key]).filter((value): value is number => value !== null);
    return values.length ? normalizeSeries(values.length === 1 ? [values[0], values[0], values[0], values[0]] : values) : zeroBars;
  };

  const latestPeriod = rows.at(-1)?.periodLabel;

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Analytics" shellVariant="analytics">
    <div className="content analytics-reference" aria-label="Google Analytics 4 performance">
      <div className="analytics-reference-heading"><div><span className="analytics-reference-accent" /><h1>Website analytics</h1><p>Understand what visitors do after they arrive.</p></div><div className="analytics-reference-heading-actions">{isDraftPreview ? <span className="data-confidence data-confidence-preview"><CheckCircle2 size={14} /> Draft preview · not client-visible</span> : <span className={`analytics-reference-connected${hasReportingData ? "" : " is-waiting"}`}>{hasReportingData ? <CheckCircle2 size={14} /> : <Clock3 size={14} />} {hasReportingData ? "GA4 data available" : "GA4 awaiting sync"}</span>}<span className="analytics-reference-updated">{latestPeriod ? `Latest published period · ${latestPeriod}` : "No GA4 values published"}</span></div></div>
      <section className="analytics-reference-kpis" aria-label="Google Analytics key metrics">{[["Active users", valueFor("activeUsers"), "purple", "activeUsers"], ["Event count", valueFor("eventCount"), "blue", "eventCount"], ["Key events", valueFor("keyEvents"), "orange", "keyEvents"], ["Views", valueFor("views"), "teal", "views"]].map(([label, value, tone, key]) => <article className="analytics-reference-kpi" key={String(label)}><div><span className={`analytics-reference-kpi-icon ${tone}`}><UsersRound size={16} /></span><strong>{label}</strong></div><b>{compact(value as number | null)}</b><MiniBars values={sparkline(key as AnalyticsViewKey)} /></article>)}</section>
      <div className="analytics-reference-main-grid"><section className="analytics-reference-card analytics-reference-chart-card"><div className="analytics-reference-card-heading"><h2>Sessions over time</h2><div className="analytics-reference-chart-heading-actions">{compare !== "none" ? <span className="analytics-reference-chart-legend"><i /> Current {comparisonValues ? <><i className="comparison" /> {compareOptions.find((option) => option.key === compare)?.label}</> : null}</span> : null}<DateRangePicker value={dateRange} onApply={setDateRange} /></div></div><ReferenceTrendChart values={trendValues} labels={trendLabels} comparisonValues={comparisonValues} tooltipValues={rawTrendValues} /><div className="analytics-reference-chart-footer"><span className="analytics-reference-chart-note">{displayedTrendStatus === "loading" ? "Loading daily GA4 data…" : displayedTrendStatus === "ready" ? `${rawTrendSource.length} daily point${rawTrendSource.length === 1 ? "" : "s"} · ${selectedRange.label}${compare !== "none" && !comparisonValues ? " · comparison data unavailable" : ""}` : visibleRows.length > 0 ? `${visibleRows.length} published period${visibleRows.length === 1 ? "" : "s"} · ${selectedRange.label}` : `0 sessions · no published rows in ${selectedRange.label.toLowerCase()}`}</span></div></section>{showRealtime ? <AnalyticsRealtime /> : <section className="analytics-reference-card analytics-realtime-panel" aria-label="Google Analytics realtime activity"><div className="analytics-realtime-panel-heading"><div><h2>Realtime activity</h2><p>Live activity is excluded from this draft preview.</p></div><span className="analytics-realtime-status is-empty"><span /> Draft preview</span></div><div className="analytics-realtime-empty"><Clock3 size={18} /><div><strong>Realtime data is not part of the draft</strong><p>Review the published GA4 metrics here. Client-visible realtime activity remains available only in the live portal.</p></div></div></section>}</div>
      <section className="analytics-reference-card analytics-reference-results-card" aria-labelledby="analytics-results-title"><div className="analytics-reference-card-heading"><div><h2 id="analytics-results-title">Results by month</h2><p>Stored GA4 data · {selectedRange.label}</p></div><div className="analytics-reference-results-actions"><Table2 size={18} aria-hidden="true" /></div></div><div className="analytics-reference-table-wrap"><table className="analytics-reference-results-table"><thead><tr><th>Month</th><th>Active users</th><th>Sessions</th><th>Organic sessions</th><th>Views</th><th>Engaged sessions</th><th>Engagement rate</th><th>Events</th><th>Key events</th></tr></thead><tbody>{visibleRows.length ? visibleRows.map((row, index) => <tr className={index === visibleRows.length - 1 ? "is-latest" : undefined} key={row.periodStart}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest period" : "Historical period"}</span></td><td>{analyticsTableValue(row.activeUsers, "INTEGER")}</td><td>{analyticsTableValue(row.sessions, "INTEGER")}</td><td>{analyticsTableValue(row.organicSessions, "INTEGER")}</td><td>{analyticsTableValue(row.views, "INTEGER")}</td><td>{analyticsTableValue(row.engagedSessions, "INTEGER")}</td><td>{analyticsTableValue(row.engagementRate, "PERCENT")}</td><td>{analyticsTableValue(row.eventCount, "INTEGER")}</td><td>{analyticsTableValue(row.keyEvents, "INTEGER")}</td></tr>) : <tr><td colSpan={9}>No stored GA4 data for this range.</td></tr>}</tbody></table></div><div className="analytics-reference-table-foot"><span>Rows are read from the stored GA4 monthly reporting periods.</span><span>{visibleRows.length} period{visibleRows.length === 1 ? "" : "s"} · {selectedRange.label}</span></div></section>
    </div>
  </AppShell>;
}
