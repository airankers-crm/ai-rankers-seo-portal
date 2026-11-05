"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Info, Search, Table2, TrendingUp } from "lucide-react";
import { DateRangePicker, getDefaultDateRange, type DateRangeSelection } from "./date-range-picker";
import { AppShell } from "./app-shell";

export type WebsiteSeoMetric = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  format: "INTEGER" | "DECIMAL" | "PERCENT" | "CURRENCY" | "RANK";
  source: string;
  description: string;
};

export type WebsiteSeoRow = {
  periodStart: string;
  periodLabel: string;
  organicTraffic: number | null;
  impressions: number | null;
  topTen: number | null;
};

function initialRange(): DateRangeSelection {
  const now = new Date();
  return { ...getDefaultDateRange(), label: "This year", start: new Date(now.getFullYear(), 0, 1) };
}

function formatMetric(value: number | null, format: WebsiteSeoMetric["format"]) {
  if (value === null) return "—";
  if (format === "PERCENT") return `${value.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${value.toLocaleString()}`;
  if (format === "DECIMAL") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString();
}

function compactMetric(value: number | null, format: WebsiteSeoMetric["format"]) {
  if (value === null) return "—";
  if (format === "INTEGER" && value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatMetric(value, format);
}

function formatTrend(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "No comparison";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function metricTrend(metric: WebsiteSeoMetric) {
  if (metric.value === null || metric.previousValue === null || metric.previousValue === 0) return null;
  return ((metric.value - metric.previousValue) / Math.abs(metric.previousValue)) * 100;
}

export function WebsiteSeoDashboard({ clientName, brandMark, brandAccent, metrics, rows }: { clientName: string; brandMark: string; brandAccent: string; metrics: WebsiteSeoMetric[]; rows: WebsiteSeoRow[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.key, metric])), [metrics]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const date = new Date(row.periodStart);
      const inRange = date >= dateRange.start && date <= new Date(dateRange.end.getTime() + 24 * 60 * 60 * 1000 - 1);
      return inRange && (!normalizedQuery || row.periodLabel.toLowerCase().includes(normalizedQuery));
    });
  }, [dateRange, query, rows]);

  const organic = metricMap.get("organicTraffic");
  const impressions = metricMap.get("impressions");
  const topTen = metricMap.get("topTen");

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Website SEO">
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Website SEO / Organic visibility</p>
          <h1>See how search visibility is changing.</h1>
          <p>Review the performance signals behind your client’s organic growth, then use the detail table to decide where the next work should focus.</p>
        </div>
        <div className="heading-actions"><span className="data-confidence"><CheckCircle2 size={13} /> Presentation data</span></div>
      </div>

      <section className="card seo-context-card" aria-labelledby="seo-context-title">
        <div className="seo-context-copy"><div className="seo-context-label"><span className="client-brand-mark" style={{ backgroundColor: brandAccent }}>{brandMark}</span> SEO performance context</div><h2 id="seo-context-title">Visibility has a stronger base for the next optimization cycle.</h2><p>Organic sessions, Search Console impressions, and top-10 keyword coverage are shown together so the client can see both demand and discoverability.</p></div>
        <div className="seo-context-note"><Info size={15} /><div><strong>How to read this page</strong><span>Values are grouped by reporting period. Source labels and freshness cues stay visible until live provider sync is connected.</span></div></div>
      </section>

      <div className="range-bar seo-range-bar"><DateRangePicker value={dateRange} onApply={setDateRange} /><div className="freshness-summary"><span className="freshness-dot" /> Sources labeled · last synced Nov 3, 2026</div></div>

      <div className="seo-metric-grid">
        {[organic, impressions, topTen].filter((metric): metric is WebsiteSeoMetric => Boolean(metric)).map((metric) => {
          const trend = metricTrend(metric);
          return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span>{metric.label}</span><span className="source-badge">{metric.source}</span></div><strong>{compactMetric(metric.value, metric.format)}</strong><div className="seo-metric-foot"><span className={trend === null || trend >= 0 ? "trend-up" : "trend-down"}>{trend !== null && (trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {formatTrend(trend)}</span><span>vs previous period</span></div><p>{metric.description}</p></article>;
        })}
      </div>

      <section className="card panel seo-table-panel" aria-labelledby="seo-table-title">
        <div className="panel-heading"><div><p className="eyebrow">Performance detail</p><h2 id="seo-table-title">Organic visibility by period</h2><p>Use this view to spot sustained movement before opening a page or keyword-level detail view.</p></div><Table2 size={18} color="#148f83" /></div>
        <div className="seo-table-toolbar"><label className="seo-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search periods" /></label><span className="panel-meta">{visibleRows.length} periods · {dateRange.label}</span></div>
        {visibleRows.length === 0 ? <div className="empty-state"><div className="empty-state-mark"><Table2 size={15} /></div><p>No periods match this range. Try a broader date range or clear the search.</p></div> : <div className="seo-table-wrap"><table className="seo-table"><thead><tr><th>Reporting period</th><th><span>Organic sessions</span><small>GA4 · higher is better</small></th><th><span>Search impressions</span><small>GSC · higher is better</small></th><th><span>Top-10 keywords</span><small>Rank source · higher is better</small></th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.organicTraffic, organic?.format ?? "INTEGER")}</td><td>{formatMetric(row.impressions, impressions?.format ?? "INTEGER")}</td><td>{formatMetric(row.topTen, topTen?.format ?? "INTEGER")}</td></tr>)}</tbody></table></div>}
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Trend direction is interpreted using each metric’s higher-is-better setting.</span><span>Provider sync will replace presentation values when connected.</span></div>
      </section>

      <div className="seo-bottom-grid"><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Next focus</p><h2>Turn visibility into qualified demand.</h2><p>Use the strongest search signals to prioritize service-page improvements, internal linking, and conversion-focused content.</p></div></div><div className="seo-next-list"><div><CheckCircle2 size={15} /><span>Review pages attracting new organic sessions.</span></div><div><CheckCircle2 size={15} /><span>Connect source freshness before publishing a client report.</span></div><div><CheckCircle2 size={15} /><span>Compare keyword movement with completed SEO activities.</span></div></div></section><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Metric definitions</p><h2>Make the numbers clear.</h2><p>Every future provider-backed metric will keep its definition and source beside the value.</p></div></div><div className="definition-list">{metrics.map((metric) => <div key={metric.key}><strong>{metric.label}</strong><span>{metric.description}</span></div>)}</div></section></div>
    </div>
  </AppShell>;
}
