"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Compass, MapPin, MessageSquareText, Phone, RotateCcw, Search, SlidersHorizontal, Star, TrendingUp } from "lucide-react";
import { AppShell } from "./app-shell";

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
  { key: "views", label: "Search & Maps impressions", icon: MapPin },
  { key: "calls", label: "Call clicks", icon: Phone },
  { key: "clicks", label: "Website clicks", icon: TrendingUp },
  { key: "directions", label: "Direction requests", icon: Compass },
  { key: "reviews", label: "Reviews received", icon: Star },
];

function formatMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function formatHeadlineMetric(value: number | null) {
  return value === null ? "Not available" : value.toLocaleString();
}

function trend(metric: GbpMetric) {
  if (metric.value === null || metric.previousValue === null || metric.previousValue === 0) return null;
  return ((metric.value - metric.previousValue) / Math.abs(metric.previousValue)) * 100;
}

function chartPath(data: Array<{ value: number }>) {
  if (data.length < 2) return "";
  const width = 640;
  const height = 190;
  const padding = 18;
  const max = Math.max(...data.map((point) => point.value), 1);
  const min = Math.min(...data.map((point) => point.value), 0);
  const range = Math.max(max - min, 1);
  return data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
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
  const displayRows = useMemo(() => rowsForDisplay(rows, displayFilter), [displayFilter, rows]);
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return displayRows.filter((row) => !normalized || row.periodLabel.toLowerCase().includes(normalized));
  }, [displayRows, query]);

  const activeMetric = currentMetric(metrics, activeMetricKey);
  const hasChannelBreakdown = metrics.some((metric) => /(^|-)search($|-)|(^|-)maps($|-)/i.test(metric.key));
  const visibleMetrics = metricFilter === "all" ? metrics : metrics.filter((metric) => metric.key === metricFilter);
  const callsChange = trend(currentMetric(metrics, "calls") ?? { key: "calls", label: "Calls", value: null, previousValue: null, source: "GBP", description: "" });
  const clicksChange = trend(currentMetric(metrics, "clicks") ?? { key: "clicks", label: "Website clicks", value: null, previousValue: null, source: "GBP", description: "" });
  const insightTokens = { callsChange: callsChange === null ? "not available" : `${callsChange >= 0 ? "+" : ""}${callsChange.toFixed(0)}%`, websiteTrend: clicksChange === null ? "not available" : clicksChange >= 0 ? "trending upward" : "trending downward" };
  const trendData = visibleRows.filter((row) => row[activeMetricKey] !== null).map((row) => ({ label: row.periodLabel, value: row[activeMetricKey] as number }));
  const latestAvailableRow = displayRows.at(-1);
  const hasPublishedData = displayRows.length > 0;
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
  }

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="GBP performance" hiddenNav={isSectionPublished ? [] : ["GBP performance"]}>
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
          <label className="gbp-filter-control"><span>Metric</span><select aria-label="Metric" value={metricFilter} onChange={(event) => { const value = event.target.value as "all" | GbpMetricKey; setMetricFilter(value); if (value !== "all") setActiveMetricKey(value); }}>{<option value="all">All metrics</option>}{metrics.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}</select></label>
          <label className="gbp-filter-control"><span>Channel</span><select aria-label="Channel" value={hasChannelBreakdown ? channelFilter : "search-maps"} disabled={!hasChannelBreakdown} onChange={(event) => setChannelFilter(event.target.value as GbpChannelKey)}><option value="search-maps">{presentation.channelLabel}</option>{hasChannelBreakdown ? <><option value="search">Google Search</option><option value="maps">Google Maps</option></> : null}</select></label>
          <label className="gbp-filter-control"><span>Display</span><select aria-label="Display" value={displayFilter} onChange={(event) => setDisplayFilter(event.target.value as GbpDisplayKey)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
          <label className="gbp-filter-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search months" /></label>
          <button className="button gbp-filter-reset" type="button" onClick={resetFilters}><RotateCcw size={13} /> Reset</button>
        </div>
        <div className={`freshness-summary${hasPublishedData ? " is-ready" : " is-pending"}`}><span className="freshness-dot" /> {hasPublishedData ? `Published GBP data through ${latestAvailableRow?.periodLabel}` : "No published GBP data"}</div>
        {!hasChannelBreakdown && <p className="gbp-filter-note">Google Business Profile currently provides Search + Maps as one aggregate. Channel-level filtering will appear when split data is connected.</p>}
      </section>

      {hasPublishedData ? <>
      <div className="seo-metric-grid gbp-metric-grid">
        {visibleMetrics.map((metric) => { const change = trend(metric); const metricInfo = metricPresentation.find((item) => item.key === metric.key); const Icon = metricInfo?.icon ?? MessageSquareText; return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span className="gbp-metric-label"><span className="gbp-metric-icon"><Icon size={15} /></span><span>{metric.label}</span></span><span className={`source-badge${metric.value === null ? " pending" : ""}`}>{metric.value === null ? "Not connected" : "Reported"}</span></div><div className="gbp-metric-value"><strong>{formatHeadlineMetric(metric.value)}</strong></div><div className="seo-metric-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {change === null ? "No comparison" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</span><span>vs previous period</span></div><p>{metric.description}</p></article>; })}
      </div>

      <div className="gbp-analysis-grid">
      <section className="card panel gbp-trend-panel" aria-labelledby="gbp-trend-title">
        <div className="panel-heading"><div><h2 id="gbp-trend-title">{presentation.chartTitle}</h2></div><span className="panel-meta">{trendData.length} periods</span></div>
        <div className="gbp-trend-tabs" role="tablist" aria-label="GBP trend metrics">{metrics.map((metric) => <button key={metric.key} type="button" role="tab" aria-selected={activeMetricKey === metric.key} className={activeMetricKey === metric.key ? "active" : ""} onClick={() => setActiveMetricKey(metric.key as GbpMetricKey)}>{metric.label}</button>)}</div>
        {trendData.length > 1 ? <div className="gbp-chart-wrap" role="img" aria-label={`${activeMetric?.label ?? "Profile"} trend chart`}><svg viewBox="0 0 640 190" preserveAspectRatio="none"><defs><linearGradient id="gbpTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#148f83" stopOpacity=".25" /><stop offset="100%" stopColor="#148f83" stopOpacity=".02" /></linearGradient></defs><line x1="18" x2="622" y1="40" y2="40" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="95" y2="95" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="172" y2="172" className="gbp-chart-grid-line" /><path d={`${chartPath(trendData)} L622 172 L18 172 Z`} fill="url(#gbpTrendFill)" /><path d={chartPath(trendData)} className="gbp-chart-line" fill="none" /></svg><div className="gbp-chart-labels"><span>{trendData[0]?.label}</span><strong>{activeMetric?.label ?? "Profile activity"}</strong><span>{trendData.at(-1)?.label}</span></div></div> : <div className="gbp-chart-empty"><BarChart3 size={16} /><div><strong>Trend detail will appear here</strong><p>Publish at least two reporting periods for this metric to show movement over time.</p></div></div>}
      </section>

      <aside className="card gbp-key-insights" aria-labelledby="gbp-insights-title"><div className="gbp-key-insights-heading"><span className="gbp-insight-icon"><BarChart3 size={16} /></span><h2 id="gbp-insights-title">{presentation.insightTitle}</h2></div><p className="gbp-key-insight"><CheckCircle2 size={14} /> {renderInsight(presentation.insightOne, insightTokens)}</p><p className="gbp-key-insight"><CheckCircle2 size={14} /> {renderInsight(presentation.insightTwo, insightTokens)}</p><p className="gbp-key-insight-source">{presentation.insightSource}</p></aside>
      </div>

      <section className="card panel seo-table-panel" aria-labelledby="gbp-table-title">
        <div className="panel-heading"><div><h2 id="gbp-table-title">Results by month</h2></div></div>
        <div className="seo-table-toolbar"><span className="panel-meta">{visibleRows.length} periods{query ? " · filtered" : ""}</span></div>
        {visibleRows.length === 0 ? <div className="empty-state"><p>No reporting periods match your search.</p></div> : <div className="seo-table-wrap"><table className="seo-table gbp-results-table"><thead><tr><th>Month</th><th>Search &amp; Maps impressions</th><th>Call clicks</th><th>Website clicks</th><th>Direction requests</th><th>Reviews received</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart} className={index === visibleRows.length - 1 ? "is-latest" : undefined}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.views)}</td><td>{formatMetric(row.calls)}</td><td>{formatMetric(row.clicks)}</td><td>{formatMetric(row.directions)}</td><td>{formatMetric(row.reviews)}</td></tr>)}</tbody><tfoot><tr><td><strong>Total ({visibleRows.length} months)</strong></td><td>{formatMetric(totalFor("views"))}</td><td>{formatMetric(totalFor("calls"))}</td><td>{formatMetric(totalFor("clicks"))}</td><td>{formatMetric(totalFor("directions"))}</td><td>{formatMetric(totalFor("reviews"))}</td></tr></tfoot></table></div>}
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Positive movement is based on the selected metric’s previous period.</span><span>— means no published result for that period.</span></div>
      </section>
      </> : <section className="card gbp-empty-state" aria-labelledby="gbp-empty-title"><div className="gbp-empty-icon"><BarChart3 size={20} /></div><div><p className="eyebrow">Data status</p><h2 id="gbp-empty-title">No GBP data published yet.</h2><p>This page will show Google Business Profile performance after the first reporting period is published.</p><div className="gbp-empty-points"><span><MapPin size={13} /> Search and Maps impressions</span><span><Phone size={13} /> Calls, clicks, and directions</span><span><Star size={13} /> Reviews</span></div></div></section>}

      <section className="card gbp-report-note"><div className="gbp-report-note-icon"><MessageSquareText size={16} /></div><div><strong>About these numbers</strong><p>Impressions show how often the profile appeared. Calls, website clicks, and directions show customer actions. Reviews show recent reputation activity.</p></div></section>
    </div>
  </AppShell>;
}
