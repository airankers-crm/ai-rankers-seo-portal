"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Compass, MapPin, MessageSquareText, Phone, Search, Star, TrendingUp } from "lucide-react";
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

type GbpMetricKey = "calls" | "views" | "clicks" | "directions" | "reviews";

const metricPresentation: Array<{ key: GbpMetricKey; label: string; icon: typeof Phone }> = [
  { key: "views", label: "Profile views", icon: MapPin },
  { key: "calls", label: "Calls", icon: Phone },
  { key: "clicks", label: "Website clicks", icon: TrendingUp },
  { key: "directions", label: "Direction requests", icon: Compass },
  { key: "reviews", label: "Reviews received", icon: Star },
];

function initialRange(): DateRangeSelection {
  const now = new Date();
  return { ...getDefaultDateRange(), label: "This year", start: new Date(now.getFullYear(), 0, 1) };
}

function formatMetric(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
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

export function GbpPerformanceDashboard({ clientName, brandMark, brandAccent, metrics, rows }: { clientName: string; brandMark: string; brandAccent: string; metrics: GbpMetric[]; rows: GbpPeriodRow[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const [activeMetricKey, setActiveMetricKey] = useState<GbpMetricKey>("calls");
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const date = new Date(row.periodStart);
      const inRange = date >= dateRange.start && date <= new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1);
      return inRange && (!normalized || row.periodLabel.toLowerCase().includes(normalized));
    });
  }, [dateRange, query, rows]);

  const activeMetric = currentMetric(metrics, activeMetricKey);
  const trendData = visibleRows.filter((row) => row[activeMetricKey] !== null).map((row) => ({ label: row.periodLabel, value: row[activeMetricKey] as number }));
  const latestRow = visibleRows.at(-1);
  const actionValues = [latestRow?.calls, latestRow?.clicks, latestRow?.directions].filter((value): value is number => value !== null && value !== undefined);
  const latestActions = actionValues.reduce((sum, value) => sum + value, 0);
  const latestActionsLabel = actionValues.length === 3 ? "customer actions" : actionValues.length === 1 ? "reported action" : "reported actions";
  const latestViews = latestRow?.views ?? null;
  const latestReviews = latestRow?.reviews ?? null;

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="GBP performance">
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Local SEO / Google Business Profile</p>
          <h1>Local visibility performance</h1>
          <p>{clientName} · A clear view of profile discovery, customer actions, and reputation movement.</p>
        </div>
        <div className="heading-actions"><span className="data-confidence"><BarChart3 size={13} /> Client report view</span></div>
      </div>

      <section className="card seo-context-card gbp-context-card" aria-labelledby="gbp-context-title">
        <div className="seo-context-copy"><div className="seo-context-label"><span className="client-brand-mark" style={{ backgroundColor: brandAccent }}>{brandMark}</span> Google Business Profile</div><h2 id="gbp-context-title">How local customers found and engaged with you.</h2><p>Track discovery in Google Search and Maps alongside the actions that matter to the business: calls, website visits, directions, and reviews.</p></div>
        <div className="gbp-report-summary"><div><span>Reporting range</span><strong>{dateRange.label}</strong></div><div><span>Latest profile activity</span><strong>{latestActions ? latestActions.toLocaleString() : "—"}</strong><small>{latestActions ? latestActionsLabel : "No published activity"}</small></div></div>
      </section>

      <div className="range-bar seo-range-bar"><DateRangePicker value={dateRange} onApply={setDateRange} /><div className="freshness-summary"><span className="freshness-dot" /> Reporting values are shown for the selected range</div></div>

      <div className="seo-metric-grid gbp-metric-grid">
        {metrics.map((metric) => { const change = trend(metric); const presentation = metricPresentation.find((item) => item.key === metric.key); const Icon = presentation?.icon ?? MessageSquareText; return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span>{metric.label}</span><span className="source-badge">{metric.value === null ? "—" : "Reported"}</span></div><div className="gbp-metric-value"><span className="gbp-metric-icon"><Icon size={15} /></span><strong>{formatMetric(metric.value)}</strong></div><div className="seo-metric-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {change === null ? "No comparison" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</span><span>vs previous period</span></div><p>{metric.description}</p></article>; })}
      </div>

      <div className="gbp-insight-grid">
        <article className="card gbp-insight-card"><div className="gbp-insight-icon discovery"><MapPin size={16} /></div><div><span>Discovery</span><strong>{formatMetric(latestViews)}</strong><p>Profile views in the latest available period.</p></div></article>
        <article className="card gbp-insight-card"><div className="gbp-insight-icon actions"><Phone size={16} /></div><div><span>Customer actions</span><strong>{latestActions ? latestActions.toLocaleString() : "—"}</strong><p>Calls, website clicks, and direction requests reported for the period.</p></div></article>
        <article className="card gbp-insight-card"><div className="gbp-insight-icon reputation"><Star size={16} /></div><div><span>Reputation activity</span><strong>{formatMetric(latestReviews)}</strong><p>New reviews received in the latest available period.</p></div></article>
      </div>

      <section className="card panel gbp-trend-panel" aria-labelledby="gbp-trend-title">
        <div className="panel-heading"><div><p className="eyebrow">Performance trend</p><h2 id="gbp-trend-title">Profile activity over time</h2><p>Use the view selector to compare the local actions that matter most.</p></div><span className="panel-meta">{trendData.length} periods</span></div>
        <div className="gbp-trend-tabs" role="tablist" aria-label="GBP trend metrics">{metricPresentation.map((item) => <button key={item.key} type="button" role="tab" aria-selected={activeMetricKey === item.key} className={activeMetricKey === item.key ? "active" : ""} onClick={() => setActiveMetricKey(item.key)}>{item.label}</button>)}</div>
        {trendData.length > 1 ? <div className="gbp-chart-wrap" role="img" aria-label={`${activeMetric?.label ?? "Profile"} trend chart`}><svg viewBox="0 0 640 190" preserveAspectRatio="none"><defs><linearGradient id="gbpTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#148f83" stopOpacity=".25" /><stop offset="100%" stopColor="#148f83" stopOpacity=".02" /></linearGradient></defs><line x1="18" x2="622" y1="40" y2="40" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="95" y2="95" className="gbp-chart-grid-line" /><line x1="18" x2="622" y1="172" y2="172" className="gbp-chart-grid-line" /><path d={`${chartPath(trendData)} L622 172 L18 172 Z`} fill="url(#gbpTrendFill)" /><path d={chartPath(trendData)} className="gbp-chart-line" fill="none" /></svg><div className="gbp-chart-labels"><span>{trendData[0]?.label}</span><strong>{activeMetric?.label ?? "Profile activity"}</strong><span>{trendData.at(-1)?.label}</span></div></div> : <div className="gbp-chart-empty"><BarChart3 size={16} /><div><strong>Trend detail will appear here</strong><p>Publish at least two reporting periods for this metric to show movement over time.</p></div></div>}
      </section>

      <section className="card panel seo-table-panel" aria-labelledby="gbp-table-title">
        <div className="panel-heading"><div><p className="eyebrow">Acquisition and actions</p><h2 id="gbp-table-title">Google Business Profile results by period</h2><p>Compare how local visibility translated into customer actions.</p></div><CalendarDays size={18} color="#148f83" /></div>
        <div className="seo-table-toolbar"><label className="seo-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search periods" /></label><span className="panel-meta">{visibleRows.length} periods · {dateRange.label}</span></div>
        {visibleRows.length === 0 ? <div className="empty-state"><div className="empty-state-mark"><CalendarDays size={15} /></div><p>No reporting periods match this range.</p></div> : <div className="seo-table-wrap"><table className="seo-table gbp-results-table"><thead><tr><th>Reporting period</th><th><span>Profile views</span><small>Discovery</small></th><th><span>Calls</span><small>Phone actions</small></th><th><span>Website clicks</span><small>Website actions</small></th><th><span>Directions</span><small>Visit intent</small></th><th><span>Reviews</span><small>Reputation</small></th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.views)}</td><td>{formatMetric(row.calls)}</td><td>{formatMetric(row.clicks)}</td><td>{formatMetric(row.directions)}</td><td>{formatMetric(row.reviews)}</td></tr>)}</tbody></table></div>}
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Positive movement is based on the selected metric’s previous period.</span><span>— means no published result for that period.</span></div>
      </section>

      <section className="card gbp-report-note"><div className="gbp-report-note-icon"><MessageSquareText size={16} /></div><div><strong>Reading this report</strong><p>Profile views show local discovery. Calls, website clicks, and directions show customer intent. Reviews show reputation activity. Together they provide a clearer picture of local search performance than a single headline number.</p></div></section>
    </div>
  </AppShell>;
}
