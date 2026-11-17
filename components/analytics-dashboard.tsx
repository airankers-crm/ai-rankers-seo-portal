"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, FileInput, MapPin, Phone, Send, Target, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "./app-shell";
import { DateRangePicker, getDefaultDateRange, type DateRangeSelection } from "./date-range-picker";

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
  keyEvents: number | null;
  phoneClicks: number | null;
  formSubmissions: number | null;
  quoteRequests: number | null;
};

export type AnalyticsLandingPage = { path: string; users: number | null; views: number | null; keyEvents: number | null };
type AnalyticsViewKey = "activeUsers" | "sessions" | "organicSessions" | "views" | "engagedSessions" | "engagementRate" | "keyEvents" | "phoneClicks" | "formSubmissions" | "quoteRequests";
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
const sumMetricKeys = new Set<AnalyticsViewKey>(["sessions", "organicSessions", "views", "engagedSessions", "keyEvents", "phoneClicks", "formSubmissions", "quoteRequests"]);

function compact(value: number | null) {
  if (value === null || value === undefined) return "0";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();
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

function ReferenceTable({ title, rows, href }: { title: string; rows: string[][]; href?: string }) {
  return <section className="analytics-reference-card analytics-reference-table-card"><h2>{title}</h2><div>{rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div>{href ? <Link href={href}>View details <ArrowRight size={14} /></Link> : <span className="analytics-reference-table-note">Populates from verified GA4 fields</span>}</section>;
}

export function AnalyticsDashboard({ clientName, brandMark, brandAccent, metrics, rows, landingPages }: { clientName: string; brandMark: string; brandAccent: string; metrics: AnalyticsMetric[]; rows: AnalyticsRow[]; landingPages: AnalyticsLandingPage[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getDefaultDateRange);
  const range = dateRangeKey(dateRange);
  const compare: CompareKey = dateRange.compare === "Previous period" ? "previous-period" : dateRange.compare === "Previous year" ? "previous-year" : "none";
  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.key, metric])), [metrics]);
  const connectedMetricCount = metrics.filter((metric) => metric.value !== null).length;
  const completeCoverage = connectedMetricCount === metrics.length && metrics.length > 0;
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
  const valueFor = (key: AnalyticsViewKey) => {
    if (visibleRows.length > 0) return valueForRows(key, visibleRows);
    if (rows.length > 0) return 0;
    return metricMap.get(key)?.value ?? 0;
  };
  const rawTrendSource = visibleRows.map((row) => row.sessions ?? row.organicSessions ?? 0);
  const rawTrendValues = rawTrendSource.length === 1 ? [rawTrendSource[0], rawTrendSource[0]] : rawTrendSource.length > 1 ? rawTrendSource : Array.from({ length: 6 }, () => 0);
  const trendValues = normalizeSeries(rawTrendValues);
  const trendLabels = visibleRows.length === 1 ? [visibleRows[0].periodLabel, ""] : visibleRows.length > 1 ? visibleRows.map((row) => row.periodLabel) : labelsForRange(range);
  const rawComparison = comparisonRows.map((row) => row.sessions ?? row.organicSessions ?? 0);
  const comparisonValues = rawComparison.length ? normalizeSeries(rawComparison.length === 1 ? [rawComparison[0], rawComparison[0]] : rawComparison) : undefined;
  const sparkline = (key: AnalyticsViewKey) => {
    const values = visibleRows.map((row) => row[key]).filter((value): value is number => value !== null);
    return values.length ? normalizeSeries(values.length === 1 ? [values[0], values[0], values[0], values[0]] : values) : zeroBars;
  };

  const sessions = valueFor("sessions");
  const organicSessions = valueFor("organicSessions");
  const organicShare = sessions > 0 ? Math.round((organicSessions / sessions) * 100) : null;
  const acquisitionRows = [["Organic Search", organicShare === null ? compact(organicSessions) : `${compact(organicSessions)} (${organicShare}%)`], ["Direct", "0"], ["Referral", "0"], ["Paid Search", "0"]];
  const landingTotal = landingPages.reduce((sum, page) => sum + (page.views ?? 0), 0);
  const landingRows = landingPages.length > 0
    ? [...landingPages].sort((left, right) => (right.views ?? 0) - (left.views ?? 0)).slice(0, 4).map((page) => [page.path, landingTotal > 0 ? `${compact(page.views ?? 0)} (${Math.round(((page.views ?? 0) / landingTotal) * 100)}%)` : "0"])
    : [["Page views", "0"], ["Active users", "0"], ["Key events", "0"], ["Engagement", "0"]];
  const eventRows = [["Phone clicks", compact(valueFor("phoneClicks"))], ["Form submissions", compact(valueFor("formSubmissions"))], ["Quote requests", compact(valueFor("quoteRequests"))], ["Key events", compact(valueFor("keyEvents"))]];
  const conversionRows: Array<[string, number, LucideIcon]> = [["Phone clicks", valueFor("phoneClicks"), Phone], ["Form submissions", valueFor("formSubmissions"), FileInput], ["Quote requests", valueFor("quoteRequests"), Send]];
  const actionTrackingReady = conversionRows.some(([, value]) => value > 0);
  const latestPeriod = rows.at(-1)?.periodLabel;
  const connectionRows = [
    { label: "Published GA4 values", ready: hasReportingData, detail: hasReportingData ? `${connectedMetricCount} fields` : "Waiting" },
    { label: "Complete summary coverage", ready: completeCoverage, detail: `${connectedMetricCount} of ${metrics.length}` },
    { label: "Realtime reporting", ready: false, detail: "Not connected" },
    { label: "Action-event reporting", ready: actionTrackingReady, detail: actionTrackingReady ? "Available" : "Setup required" },
  ];

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Analytics" shellVariant="analytics">
    <div className="content analytics-reference" aria-label="Google Analytics 4 performance">
      <div className="analytics-reference-heading"><div><span className="analytics-reference-accent" /><h1>Website analytics</h1><p>Understand what visitors do after they arrive.</p></div><div className="analytics-reference-heading-actions"><span className={`analytics-reference-connected${hasReportingData ? "" : " is-waiting"}`}>{hasReportingData ? <CheckCircle2 size={14} /> : <Clock3 size={14} />} {hasReportingData ? "GA4 data available" : "GA4 awaiting sync"}</span><DateRangePicker value={dateRange} onApply={setDateRange} /><span className="analytics-reference-updated">{latestPeriod ? `Latest published period · ${latestPeriod}` : "No GA4 values published"}</span></div></div>
      <section className={`analytics-reference-status${hasReportingData ? "" : " is-waiting"}`}>{hasReportingData ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}<strong>{hasReportingData ? `${connectedMetricCount} of ${metrics.length} analytics fields have published data` : "Website analytics are awaiting the first verified sync"}</strong><Link href="/portal/analytics/details">View details <ArrowRight size={14} /></Link></section>
      <section className="analytics-reference-kpis" aria-label="Google Analytics key metrics">{[["Active users", valueFor("activeUsers"), "purple", "activeUsers"], ["Sessions", sessions, "blue", "sessions"], ["Organic sessions", organicSessions, "orange", "organicSessions"], ["Key events", valueFor("keyEvents"), "teal", "keyEvents"]].map(([label, value, tone, key]) => <article className="analytics-reference-kpi" key={String(label)}><div><span className={`analytics-reference-kpi-icon ${tone}`}><UsersRound size={16} /></span><strong>{label}</strong></div><b>{compact(value as number)}</b><MiniBars values={sparkline(key as AnalyticsViewKey)} /></article>)}</section>
      <div className="analytics-reference-main-grid"><section className="analytics-reference-card analytics-reference-chart-card"><div className="analytics-reference-card-heading"><h2>Sessions over time</h2>{compare !== "none" ? <span className="analytics-reference-chart-legend"><i /> Current {comparisonValues ? <><i className="comparison" /> {compareOptions.find((option) => option.key === compare)?.label}</> : null}</span> : null}</div><ReferenceTrendChart values={trendValues} labels={trendLabels} comparisonValues={comparisonValues} tooltipValues={rawTrendValues} /><span className="analytics-reference-chart-note">{visibleRows.length > 0 ? `${visibleRows.length} reporting period${visibleRows.length === 1 ? "" : "s"} · ${selectedRange.label}${compare !== "none" && !comparisonValues ? " · comparison data unavailable" : ""}` : `0 sessions · no published rows in ${selectedRange.label.toLowerCase()}`}</span></section><section className="analytics-reference-card analytics-reference-realtime"><h2>Realtime activity</h2><span className="analytics-reference-label">ACTIVE USERS IN LAST 30 MINUTES</span><b className="analytics-reference-realtime-number">0</b><span className="analytics-reference-label">ACTIVE USERS PER MINUTE</span><MiniBars values={zeroBars} /><div className="analytics-reference-realtime-row"><span>TOP COUNTRY</span><strong>—</strong></div><div className="analytics-reference-realtime-row"><span>TOP PAGE</span><strong>—</strong></div><p className="analytics-reference-realtime-note">Realtime GA4 reporting is not connected yet.</p></section></div>
      <div className="analytics-reference-three-grid"><ReferenceTable title="Acquisition sources" rows={acquisitionRows} /><ReferenceTable title="Top pages" rows={landingRows} href="/portal/analytics/pages" /><ReferenceTable title="Event activity" rows={eventRows} /></div>
      <div className="analytics-reference-bottom-grid"><section className="analytics-reference-card analytics-reference-conversions"><div className="analytics-reference-card-heading"><h2>Conversion actions</h2><span>{actionTrackingReady ? "Published data" : "Awaiting events"}</span></div>{conversionRows.map(([label, value, Icon]) => <div className="analytics-reference-conversion-row" key={label}><span><Icon size={16} /></span><strong>{label}</strong><b>{compact(value)}</b></div>)}<p className="analytics-reference-callout"><Target size={13} /> Event tracking must be configured in GA4 before these fields can populate.</p></section><section className="analytics-reference-card analytics-reference-health"><h2>Connection health</h2>{connectionRows.map(({ label, ready, detail }) => <p key={label}>{ready ? <CheckCircle2 size={15} /> : <AlertCircle size={15} className="attention" />}<span>{label}</span><strong>{detail}</strong></p>)}</section></div>
      <p className="analytics-reference-footnote"><MapPin size={13} /> All values shown here come from published CRM metric rows. Missing fields remain 0 until the GA4 reporting API sync supplies them.</p>
    </div>
  </AppShell>;
}
