"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, CheckCircle2, Info, MapPin, MessageSquareText, Phone, Search, Star, Table2, TrendingUp } from "lucide-react";
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
};

function initialRange(): DateRangeSelection {
  const now = new Date();
  return { ...getDefaultDateRange(), label: "This year", start: new Date(now.getFullYear(), 0, 1) };
}

function formatMetric(value: number | null) {
  return value === null ? "Not connected" : value.toLocaleString();
}

function trend(metric: GbpMetric) {
  if (metric.value === null || metric.previousValue === null || metric.previousValue === 0) return null;
  return ((metric.value - metric.previousValue) / Math.abs(metric.previousValue)) * 100;
}

export function GbpPerformanceDashboard({ clientName, brandMark, brandAccent, metrics, rows }: { clientName: string; brandMark: string; brandAccent: string; metrics: GbpMetric[]; rows: GbpPeriodRow[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      const date = new Date(row.periodStart);
      const inRange = date >= dateRange.start && date <= new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1);
      return inRange && (!normalized || row.periodLabel.toLowerCase().includes(normalized));
    });
  }, [dateRange, query, rows]);

  const unavailable = metrics.filter((metric) => metric.value === null);

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="GBP performance">
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Local SEO / Google Business Profile</p>
          <h1>Google Business Profile performance</h1>
          <p>{clientName} · Local visibility and action metrics by reporting period.</p>
        </div>
        <div className="heading-actions"><span className="data-confidence"><CheckCircle2 size={13} /> Presentation data</span></div>
      </div>

      <section className="card seo-context-card gbp-context-card" aria-labelledby="gbp-context-title">
        <div className="seo-context-copy"><div className="seo-context-label"><span className="client-brand-mark" style={{ backgroundColor: brandAccent }}>{brandMark}</span> Local metric status</div><h2 id="gbp-context-title">Current GBP data coverage</h2><p>Calls are available in the presentation dataset. Views, clicks, directions, reviews, and local ranking require provider connections.</p></div>
        <div className="seo-context-note"><Info size={15} /><div><strong>Data status</strong><span>Review metric availability, source labels, and completed work together.</span></div></div>
      </section>

      <div className="range-bar seo-range-bar"><DateRangePicker value={dateRange} onApply={setDateRange} /><div className="freshness-summary"><span className="freshness-dot" /> Sources labeled · last synced Nov 3, 2026</div></div>

      <div className="seo-metric-grid gbp-metric-grid">
        {metrics.map((metric) => { const change = trend(metric); const icon = metric.key === "calls" ? <Phone size={15} /> : metric.key === "views" ? <MapPin size={15} /> : metric.key === "reviews" ? <Star size={15} /> : metric.key === "clicks" ? <TrendingUp size={15} /> : <MessageSquareText size={15} />; return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span>{metric.label}</span><span className="source-badge">{metric.source}</span></div><div className="gbp-metric-value"><span className="gbp-metric-icon">{icon}</span><strong>{formatMetric(metric.value)}</strong></div><div className="seo-metric-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {change === null ? "Awaiting source" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}</span><span>vs previous period</span></div><p>{metric.description}</p></article>; })}
      </div>

      <section className="card panel seo-table-panel" aria-labelledby="gbp-table-title">
        <div className="panel-heading"><div><p className="eyebrow">Local action trend</p><h2 id="gbp-table-title">Profile calls by period</h2><p>Compare GBP call values across reporting periods.</p></div><Table2 size={18} color="#148f83" /></div>
        <div className="seo-table-toolbar"><label className="seo-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search periods" /></label><span className="panel-meta">{visibleRows.length} periods · {dateRange.label}</span></div>
        {visibleRows.length === 0 ? <div className="empty-state"><div className="empty-state-mark"><Table2 size={15} /></div><p>No periods match this range. Try a broader date range or clear the search.</p></div> : <div className="seo-table-wrap"><table className="seo-table"><thead><tr><th>Reporting period</th><th><span>GBP calls</span><small>GBP · higher is better</small></th><th><span>Data status</span><small>Source context</small></th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.calls)}</td><td>{row.calls === null ? "Source connection required" : row.calls > 135 ? "Above current baseline" : "Within current period range"}</td></tr>)}</tbody></table></div>}
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Higher call volume is measured as a positive change.</span><span>Provider sync will replace presentation values when connected.</span></div>
      </section>

      <div className="seo-bottom-grid"><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Operational checks</p><h2>Local SEO delivery</h2><p>Review connection status and completed local SEO work.</p></div><Building2 size={18} color="#148f83" /></div><div className="seo-next-list"><div><CheckCircle2 size={15} /><span>Connect GBP views, clicks, and directions.</span></div><div><CheckCircle2 size={15} /><span>Publish review responses when the source is available.</span></div><div><CheckCircle2 size={15} /><span>Compare local activity with completed SEO work.</span></div></div></section><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Source readiness</p><h2>{unavailable.length ? `${unavailable.length} local metrics not connected` : "Local sources connected"}</h2><p>Unavailable metrics remain visible with their required next step.</p></div><MapPin size={18} color="#f26b38" /></div><div className="definition-list">{metrics.map((metric) => <div key={metric.key}><strong>{metric.label}</strong><span>{metric.value === null ? "Waiting for provider connection" : `Available from ${metric.source}`}</span></div>)}</div></section></div>
    </div>
  </AppShell>;
}
