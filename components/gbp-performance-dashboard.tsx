"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Compass, MapPin, MessageSquareText, Phone, RotateCcw, Search, SlidersHorizontal, Star, TrendingUp } from "lucide-react";
import { AppShell } from "./app-shell";
import { DateRangePicker, getDefaultDateRange, type DateRangeSelection } from "./date-range-picker";

export type GbpMetric = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  source: string;
  description: string;
};

export type GbpPeriodRow = {
  periodStart: string;
  periodLabel: string;
  calls: number | null;
  views: number | null;
  clicks: number | null;
  directions: number | null;
  reviews: number | null;
};

export type GbpPresentationSettings = {
  pageTitle: string;
  pageSubtitle: string;
  filterLabel: string;
  channelLabel: string;
  displayLabel: string;
  chartTitle: string;
  insightTitle: string;
  insightOne: string;
  insightTwo: string;
  insightSource: string;
};

export const defaultGbpPresentation: GbpPresentationSettings = {
  pageTitle: "Google Business Profile",
  pageSubtitle: "Performance from Google Search and Maps.",
  filterLabel: "Filter report",
  channelLabel: "Search + Maps",
  displayLabel: "Monthly",
  chartTitle: "Profile views over time",
  insightTitle: "Key insights",
  insightOne: "Calls increased {{callsChange}} compared with the previous period.",
  insightTwo: "Website clicks are {{websiteTrend}}.",
  insightSource: "Data is sourced from Google Search and Maps.",
};

type GbpMetricKey = "calls" | "views" | "clicks" | "directions" | "reviews";
type GbpChannelKey = "search-maps" | "search" | "maps";
type GbpDisplayKey = "monthly" | "quarterly";

const metricPresentation: Array<{ key: GbpMetricKey; label: string; icon: typeof Phone }> = [
  { key: "views", label: "Profile views", icon: MapPin },
  { key: "calls", label: "Call clicks", icon: Phone },
  { key: "clicks", label: "Website clicks", icon: TrendingUp },
  { key: "directions", label: "Direction requests", icon: Compass },
  { key: "reviews", label: "Reviews received", icon: Star },
];

function displayMetricLabel(key: string, label: string) {
  return key === "views" ? "Profile views" : label;
}

function formatMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function formatHeadlineMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function trend(metric: GbpMetric) {
  if (metric.value === null || metric.previousValue === null || metric.previousValue === 0) return null;
  return ((metric.value - metric.previousValue) / Math.abs(metric.previousValue)) * 100;
}

function chartPath(data: Array<{ value: number }>) {
  if (data.length < 2) return "";
  const points = data.map((_, index) => chartPoint(data, index));
  return points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

function chartPoint(data: Array<{ value: number }>, index: number) {
  const width = 640;
  const height = 190;
  const padding = 18;
  const max = Math.max(...data.map((point) => point.value), 1);
  const min = Math.min(...data.map((point) => point.value), 0);
  const range = Math.max(max - min, 1);
  const point = data[index];
  return { x: padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2), y: height - padding - ((point.value - min) / range) * (height - padding * 2) };
}

function currentMetric(metrics: GbpMetric[], key: GbpMetricKey) {
  return metrics.find((metric) => metric.key === key);
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderInsight(template: string, tokens: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => tokens[key] ?? "not available");
}

function sumPeriodValues(left: number | null, right: number | null) {
  if (left === null && right === null) return null;
  return (left ?? 0) + (right ?? 0);
}

function rowsForDisplay(rows: GbpPeriodRow[], display: GbpDisplayKey) {
  if (display === "monthly") return rows;

  const grouped = new Map<string, GbpPeriodRow>();
  for (const row of rows) {
    const date = new Date(row.periodStart);
    const year = date.getUTCFullYear();
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    const key = `${year}-Q${quarter}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { periodStart: row.periodStart, periodLabel: `Q${quarter} ${year}`, calls: row.calls, views: row.views, clicks: row.clicks, directions: row.directions, reviews: row.reviews });
      continue;
    }
    existing.calls = sumPeriodValues(existing.calls, row.calls);
    existing.views = sumPeriodValues(existing.views, row.views);
    existing.clicks = sumPeriodValues(existing.clicks, row.clicks);
    existing.directions = sumPeriodValues(existing.directions, row.directions);
    existing.reviews = sumPeriodValues(existing.reviews, row.reviews);
  }
  return [...grouped.values()].sort((left, right) => left.periodStart.localeCompare(right.periodStart));
}

export function GbpPerformanceDashboard({ clientName, brandMark, brandAccent, metrics, rows, presentation = defaultGbpPresentation, connectionStatus = "not-connected", dataUpdatedAt = null, showDataUpdatedAt = false, isDraftPreview = false, isSectionPublished = true }: { clientName: string; brandMark: string; brandAccent: string; metrics: GbpMetric[]; rows: GbpPeriodRow[]; presentation?: GbpPresentationSettings; connectionStatus?: "connected" | "not-connected"; dataUpdatedAt?: string | null; showDataUpdatedAt?: boolean; isDraftPreview?: boolean; isSectionPublished?: boolean }) {
  const [query, setQuery] = useState("");
  const [metricFilter, setMetricFilter] = useState<"all" | GbpMetricKey>("all");
  const [activeMetricKey, setActiveMetricKey] = useState<GbpMetricKey>("views");
  const [channelFilter, setChannelFilter] = useState<GbpChannelKey>(presentation.channelLabel.toLowerCase().includes("search") && presentation.channelLabel.toLowerCase().includes("maps") ? "search-maps" : presentation.channelLabel.toLowerCase().includes("maps") ? "maps" : "search");
  const [displayFilter, setDisplayFilter] = useState<GbpDisplayKey>(presentation.displayLabel.toLowerCase().includes("quarter") ? "quarterly" : "monthly");
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getDefaultDateRange);
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; x: number; y: number } | null>(null);
  const displayMetrics = metrics.length ? metrics : metricPresentation.map((item) => ({ key: item.key, label: item.label, value: null, previousValue: null, source: "GBP", description: "Waiting for the first Google Business Profile sync." }));
  const displayRows = useMemo(() => {
    const start = Date.UTC(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
    const end = Date.UTC(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
    return rowsForDisplay(rows, displayFilter).filter((row) => { const date = new Date(row.periodStart); const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()); return day >= start && day <= end; });
  }, [dateRange.end, dateRange.start, displayFilter, rows]);
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return displayRows.filter((row) => !normalized || row.periodLabel.toLowerCase().includes(normalized));
  }, [displayRows, query]);

  const activeMetric = currentMetric(displayMetrics, activeMetricKey);
  const activeMetricLabel = activeMetric ? displayMetricLabel(activeMetric.key, activeMetric.label) : "Profile activity";
  const activeChartTitle = activeMetricKey === "views" ? presentation.chartTitle : `${activeMetricLabel} over time`;
  const hasChannelBreakdown = displayMetrics.some((metric) => /(^|-)search($|-)|(^|-)maps($|-)/i.test(metric.key));
  const visibleMetrics = metricFilter === "all" ? displayMetrics : displayMetrics.filter((metric) => metric.key === metricFilter);
  const callsChange = trend(currentMetric(displayMetrics, "calls") ?? { key: "calls", label: "Calls", value: null, previousValue: null, source: "GBP", description: "" });
  const clicksChange = trend(currentMetric(displayMetrics, "clicks") ?? { key: "clicks", label: "Website clicks", value: null, previousValue: null, source: "GBP", description: "" });
  const insightTokens = { callsChange: callsChange === null ? "not available" : `${callsChange >= 0 ? "+" : ""}${callsChange.toFixed(0)}%`, websiteTrend: clicksChange === null ? "not available" : clicksChange >= 0 ? "trending upward" : "trending downward" };
  const trendData = visibleRows.filter((row) => row[activeMetricKey] !== null).map((row) => ({ label: row.periodLabel, value: row[activeMetricKey] as number }));
  const emptyTrendData = Array.from({ length: 13 }, (_, index) => ({ label: index === 0 ? visibleRows[0]?.periodLabel ?? "Start" : index === 12 ? visibleRows.at(-1)?.periodLabel ?? "Now" : `Point ${index + 1}`, value: 0 }));
  const displayTrendData = trendData.length > 1 ? trendData : trendData.length === 1 ? [{ ...trendData[0] }, { label: "Now", value: trendData[0].value }] : emptyTrendData;
  const latestAvailableRow = displayRows.at(-1);
  const hasPublishedData = displayRows.length > 0;
  const zeroTableRow: GbpPeriodRow = { periodStart: "empty", periodLabel: "No published data", calls: null, views: null, clicks: null, directions: null, reviews: null };
  const tableRows = visibleRows.length ? visibleRows : query ? [] : [zeroTableRow];
  const totalFor = (key: keyof Pick<GbpPeriodRow, "views" | "calls" | "clicks" | "directions" | "reviews">) => {
    const values = visibleRows.map((row) => row[key]).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  function resetFilters() {
    setQuery("");
    setMetricFilter("all");
    setActiveMetricKey("views");
    setChannelFilter("search-maps");
    setDisplayFilter("monthly");
    setDateRange(getDefaultDateRange());
  }

  const handleChartMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const chartX = (relativeX / Math.max(bounds.width, 1)) * 640;
    const index = Math.round(((chartX - 18) / (640 - 36)) * (displayTrendData.length - 1));
    const safeIndex = Math.min(displayTrendData.length - 1, Math.max(0, index));
    const point = displayTrendData[safeIndex];
    if (!point) return;
    const { x, y } = chartPoint(displayTrendData, safeIndex);
    setHoveredPoint({ label: point.label, value: point.value, x, y });
  };

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="GBP performance">
    <div className="content gbp-dashboard">
      <div className="page-heading">
        <div>
          <h1>{presentation.pageTitle}</h1>
          <p>{clientName} · {presentation.pageSubtitle}</p>
          <p className={`gbp-data-status ${connectionStatus === "connected" ? "is-connected" : "is-pending"}`}><span className="gbp-data-dot" /> {connectionStatus === "connected" ? "Connected to Google Business Profile" : "Google Business Profile not connected"}{showDataUpdatedAt ? dataUpdatedAt ? ` · Updated ${formatUpdatedAt(dataUpdatedAt)}` : " · Awaiting first published result" : ""}</p>
        </div>
        <div className="heading-actions">{isDraftPreview ? <span className="data-confidence data-confidence-preview"><BarChart3 size={13} /> Draft preview · not client-visible</span> : !isSectionPublished ? <span className="data-confidence data-confidence-preview"><BarChart3 size={13} /> Section not published</span> : null}</div>
      </div>

      <section className="gbp-filter-bar" aria-label="Filter Google Business Profile report">
        <div className="gbp-filter-heading"><span className="gbp-filter-icon"><SlidersHorizontal size={15} /></span><div><strong>{presentation.filterLabel}</strong><span>Choose a metric or search reporting periods.</span></div></div>
        <div className="gbp-filter-controls">
          <label className="gbp-filter-control gbp-date-filter"><span>Date range</span><DateRangePicker value={dateRange} onApply={setDateRange} /></label>
          <label className="gbp-filter-control"><span>Metric</span><select aria-label="Metric" value={metricFilter} onChange={(event) => { const value = event.target.value as "all" | GbpMetricKey; setMetricFilter(value); if (value !== "all") setActiveMetricKey(value); }}>{<option value="all">All metrics</option>}{displayMetrics.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label>
          <label className="gbp-filter-control"><span>Channel</span><select aria-label="Channel" value={hasChannelBreakdown ? channelFilter : "search-maps"} disabled={!hasChannelBreakdown} onChange={(event) => setChannelFilter(event.target.value as GbpChannelKey)}><option value="search-maps">{presentation.channelLabel}</option>{hasChannelBreakdown ? <><option value="search">Google Search</option><option value="maps">Google Maps</option></> : null}</select></label>
          <label className="gbp-filter-control"><span>Display</span><select aria-label="Display" value={displayFilter} onChange={(event) => setDisplayFilter(event.target.value as GbpDisplayKey)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
          <label className="gbp-filter-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search months" /></label>
          <button className="button gbp-filter-reset" type="button" onClick={resetFilters}><RotateCcw size={13} /> Reset</button>
        </div>
        <div className={`freshness-summary${hasPublishedData ? " is-ready" : " is-pending"}`}><span className="freshness-dot" /> {hasPublishedData ? `Published GBP data through ${latestAvailableRow?.periodLabel}` : "No published GBP data"}</div>
      </section>

      <>
      <div className="seo-metric-grid gbp-metric-grid">
        {visibleMetrics.map((metric) => { const change = trend(metric); const metricInfo = metricPresentation.find((item) => item.key === metric.key); const Icon = metricInfo?.icon ?? MessageSquareText; return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span className="gbp-metric-label"><span className="gbp-metric-icon"><Icon size={15} /></span><span>{metric.label}</span></span><span className={`source-badge${metric.value === null ? " pending" : ""}`}>{metric.value === null ? "Awaiting data" : "Reported"}</span></div><div className="gbp-metric-value"><strong>{formatHeadlineMetric(metric.value)}</strong></div><div className="seo-metric-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {change === null ? "0%" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</span><span>vs previous period</span></div><p>{metric.description}</p></article>; })}
      </div>

      <div className="gbp-analysis-grid">
      <section className="card panel gbp-trend-panel" aria-labelledby="gbp-trend-title">
        <div className="panel-heading"><div><h2 id="gbp-trend-title">{presentation.chartTitle}</h2></div><span className="panel-meta">{trendData.length} periods</span></div>
        <div className="gbp-trend-tabs" role="tablist" aria-label="GBP trend metrics">{displayMetrics.map((metric) => <button key={metric.key} type="button" role="tab" aria-selected={activeMetricKey === metric.key} className={activeMetricKey === metric.key ? "active" : ""} onClick={() => setActiveMetricKey(metric.key as GbpMetricKey)}>{metric.label}</button>)}</div>
        <div className="gbp-chart-wrap" role="img" aria-label={`${activeMetric?.label ?? "Profile"} trend chart`} onMouseMove={handleChartMove} onMouseLeave={() => setHoveredPoint(null)}><svg viewBox="0 0 640 190" preserveAspectRatio="none"><defs><linearGradient id="gbpTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#148f83" stopOpacity=".25" /><stop offset="100%" stopColor="#148f83" stopOpacity=".02" /></linearGradient></defs><line x1="18" x2="622" y1="40" y2="40" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="95" y2="95" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="172" y2="172" className="gbp-chart-grid-line" /><path d={`${chartPath(displayTrendData)} L622 172 L18 172 Z`} fill="url(#gbpTrendFill)" /><path d={chartPath(displayTrendData)} className="gbp-chart-line" fill="none" />{displayTrendData.map((point, index) => { const { x, y } = chartPoint(displayTrendData, index); return <g key={`${point.label}-${index}`} tabIndex={0} onMouseEnter={() => setHoveredPoint({ label: point.label, value: point.value, x, y })} onFocus={() => setHoveredPoint({ label: point.label, value: point.value, x, y })} onBlur={() => setHoveredPoint(null)}><title>{`${point.label}: ${point.value.toLocaleString()}`}</title><circle cx={x} cy={y} r="8" className="gbp-chart-point-hit" /><circle cx={x} cy={y} r="4.5" className="gbp-chart-point" /></g>})}</svg><div className="gbp-chart-labels"><span>{displayTrendData[0]?.label}</span><strong>{activeMetric?.label ?? "Profile activity"}</strong><span>{displayTrendData.at(-1)?.label}</span></div>{hoveredPoint ? <div className="gbp-chart-tooltip" style={{ left: `${(hoveredPoint.x / 640) * 100}%`, top: `${(hoveredPoint.y / 190) * 100}%` }}><strong>{hoveredPoint.label}</strong><span>{activeMetric?.label ?? "Profile activity"}: {hoveredPoint.value.toLocaleString()}</span></div> : null}</div>
      </section>

      <aside className="card gbp-key-insights" aria-labelledby="gbp-insights-title"><div className="gbp-key-insights-heading"><span className="gbp-insight-icon"><BarChart3 size={16} /></span><h2 id="gbp-insights-title">{presentation.insightTitle}</h2></div><p className="gbp-key-insight"><CheckCircle2 size={14} /> {renderInsight(presentation.insightOne, insightTokens)}</p><p className="gbp-key-insight"><CheckCircle2 size={14} /> {renderInsight(presentation.insightTwo, insightTokens)}</p><p className="gbp-key-insight-source">{presentation.insightSource}</p></aside>
      </div>

      <section className="card panel seo-table-panel" aria-labelledby="gbp-table-title">
        <div className="panel-heading"><div><h2 id="gbp-table-title">Results by month</h2></div></div>
        <div className="seo-table-toolbar"><span className="panel-meta">{visibleRows.length} periods{query ? " · filtered" : ""}</span></div>
        <div className="seo-table-wrap"><table className="seo-table gbp-results-table"><thead><tr><th>Month</th><th>Search &amp; Maps impressions</th><th>Call clicks</th><th>Website clicks</th><th>Direction requests</th><th>Reviews received</th></tr></thead><tbody>{tableRows.length ? tableRows.map((row, index) => <tr key={row.periodStart} className={index === tableRows.length - 1 ? "is-latest" : undefined}><td><strong>{row.periodLabel}</strong><span>{row.periodLabel === "No published data" ? "Awaiting first sync" : index === tableRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.views)}</td><td>{formatMetric(row.calls)}</td><td>{formatMetric(row.clicks)}</td><td>{formatMetric(row.directions)}</td><td>{formatMetric(row.reviews)}</td></tr>) : <tr><td colSpan={6}>No periods match this search.</td></tr>}</tbody><tfoot><tr><td><strong>Total ({visibleRows.length} months)</strong></td><td>{formatMetric(totalFor("views"))}</td><td>{formatMetric(totalFor("calls"))}</td><td>{formatMetric(totalFor("clicks"))}</td><td>{formatMetric(totalFor("directions"))}</td><td>{formatMetric(totalFor("reviews"))}</td></tr></tfoot></table></div>
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Positive movement is based on the selected metric’s previous period.</span><span>0 means no published result yet.</span></div>
      </section>
      </>

      <section className="card gbp-report-note"><div className="gbp-report-note-icon"><MessageSquareText size={16} /></div><div><strong>About these numbers</strong><p>Impressions show how often the profile appeared. Calls, website clicks, and directions show customer actions. Reviews show recent reputation activity.</p></div></section>
    </div>
  </AppShell>;
}
