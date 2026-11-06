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

export type WebsiteSeoChannel = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const presentationChannels: WebsiteSeoChannel[] = [
  { key: "organic", label: "Organic search", value: 8426, color: "#F26B38" },
  { key: "direct", label: "Direct", value: 3210, color: "#12243F" },
  { key: "referral", label: "Referral", value: 1680, color: "#148F83" },
  { key: "email", label: "Email", value: 1145, color: "#6F3FB5" },
  { key: "paid-social", label: "Paid social", value: 968, color: "#8E98A8" },
];

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

export function WebsiteSeoDashboard({ clientName, brandMark, brandAccent, metrics, rows, channels }: { clientName: string; brandMark: string; brandAccent: string; metrics: WebsiteSeoMetric[]; rows: WebsiteSeoRow[]; channels?: WebsiteSeoChannel[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
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
  const acquisitionChannels = channels?.length ? channels : presentationChannels;
  const acquisitionTotal = acquisitionChannels.reduce((total, channel) => total + channel.value, 0);
  const topChannel = acquisitionChannels.reduce((top, channel) => channel.value > top.value ? channel : top, acquisitionChannels[0]);
  const donutStops = acquisitionChannels.reduce<{ stops: string[]; offset: number }>((result, channel) => {
    const start = result.offset;
    const end = start + (channel.value / acquisitionTotal) * 100;
    result.stops.push(`${channel.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    result.offset = end;
    return result;
  }, { stops: [], offset: 0 }).stops.join(", ");
  const activeChannel = acquisitionChannels.find((channel) => channel.key === selectedChannel) ?? topChannel;
  const channelIsPreview = !channels?.length;

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Website SEO">
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Website SEO / Reporting</p>
          <h1>Website SEO performance</h1>
          <p>{clientName} · Organic sessions, search impressions, and keyword coverage by reporting period.</p>
        </div>
        <div className="heading-actions"><span className="data-confidence"><CheckCircle2 size={13} /> Presentation data</span></div>
      </div>

      <section className="card seo-context-card" aria-labelledby="seo-context-title">
        <div className="seo-context-copy"><div className="seo-context-label"><span className="client-brand-mark" style={{ backgroundColor: brandAccent }}>{brandMark}</span> Metric context</div><h2 id="seo-context-title">Organic search metrics</h2><p>Organic sessions, Search Console impressions, and top-10 keyword coverage shown by reporting period.</p></div>
        <div className="seo-context-note"><Info size={15} /><div><strong>Data status</strong><span>Source labels and freshness remain visible until live provider sync is connected.</span></div></div>
      </section>

      <div className="range-bar seo-range-bar"><DateRangePicker value={dateRange} onApply={setDateRange} /><div className="freshness-summary"><span className="freshness-dot" /> Sources labeled · last synced Nov 3, 2026</div></div>

      <div className="seo-metric-grid">
        {[organic, impressions, topTen].filter((metric): metric is WebsiteSeoMetric => Boolean(metric)).map((metric) => {
          const trend = metricTrend(metric);
          return <article className="card seo-metric-card" key={metric.key}><div className="seo-metric-top"><span>{metric.label}</span><span className="source-badge">{metric.source}</span></div><strong>{compactMetric(metric.value, metric.format)}</strong><div className="seo-metric-foot"><span className={trend === null || trend >= 0 ? "trend-up" : "trend-down"}>{trend !== null && (trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {formatTrend(trend)}</span><span>vs previous period</span></div><p>{metric.description}</p></article>;
        })}
      </div>

      <section className="card panel seo-acquisition-panel" aria-labelledby="seo-acquisition-title">
        <div className="panel-heading seo-acquisition-heading">
          <div><p className="eyebrow">Acquisition mix</p><h2 id="seo-acquisition-title">Traffic by channel</h2><p>See how sessions are distributed across the channels bringing people to the site.</p></div>
          <span className="source-badge">{channelIsPreview ? "GA4 preview" : "GA4"}</span>
        </div>
        <div className="seo-acquisition-layout">
          <div className="seo-donut-wrap">
            <div className="seo-donut" style={{ background: `conic-gradient(${donutStops})` }} role="img" aria-label={`${acquisitionTotal.toLocaleString()} sessions by acquisition channel`}>
              <div className="seo-donut-center"><strong>{acquisitionTotal.toLocaleString()}</strong><span>Sessions</span></div>
            </div>
            <div className="seo-donut-summary"><span>Top channel</span><strong>{topChannel.label}</strong><small>{((topChannel.value / acquisitionTotal) * 100).toFixed(1)}% of sessions</small></div>
          </div>
          <div className="seo-channel-list" aria-label="Acquisition channels">
            {acquisitionChannels.map((channel) => {
              const share = (channel.value / acquisitionTotal) * 100;
              const active = activeChannel.key === channel.key;
              return <button type="button" className={`seo-channel-row${active ? " active" : ""}`} key={channel.key} onClick={() => setSelectedChannel(channel.key)} aria-pressed={active}>
                <span className="seo-channel-swatch" style={{ backgroundColor: channel.color }} />
                <span className="seo-channel-copy"><strong>{channel.label}</strong><small>{active ? "Selected channel" : "View channel detail"}</small></span>
                <span className="seo-channel-value"><strong>{channel.value.toLocaleString()}</strong><small>{share.toFixed(1)}%</small></span>
              </button>;
            })}
          </div>
        </div>
        <div className="seo-acquisition-foot"><span><Info size={13} /> {channelIsPreview ? "Presentation mix shown until GA4 channel attribution is connected." : `Selected: ${activeChannel.label} · ${activeChannel.value.toLocaleString()} sessions`}</span><span>Higher volume is better</span></div>
      </section>

      <section className="card panel seo-table-panel" aria-labelledby="seo-table-title">
        <div className="panel-heading"><div><p className="eyebrow">Performance detail</p><h2 id="seo-table-title">Organic search by period</h2><p>Compare period values before reviewing page or keyword detail.</p></div><Table2 size={18} color="#148f83" /></div>
        <div className="seo-table-toolbar"><label className="seo-search"><Search size={14} /><span className="sr-only">Search reporting periods</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search periods" /></label><span className="panel-meta">{visibleRows.length} periods · {dateRange.label}</span></div>
        {visibleRows.length === 0 ? <div className="empty-state"><div className="empty-state-mark"><Table2 size={15} /></div><p>No periods match this range. Try a broader date range or clear the search.</p></div> : <div className="seo-table-wrap"><table className="seo-table"><thead><tr><th>Reporting period</th><th><span>Organic sessions</span><small>GA4 · higher is better</small></th><th><span>Search impressions</span><small>GSC · higher is better</small></th><th><span>Top-10 keywords</span><small>Rank source · higher is better</small></th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest available period" : "Historical period"}</span></td><td>{formatMetric(row.organicTraffic, organic?.format ?? "INTEGER")}</td><td>{formatMetric(row.impressions, impressions?.format ?? "INTEGER")}</td><td>{formatMetric(row.topTen, topTen?.format ?? "INTEGER")}</td></tr>)}</tbody></table></div>}
        <div className="seo-table-foot"><span><TrendingUp size={13} /> Trend direction is interpreted using each metric’s higher-is-better setting.</span><span>Provider sync will replace presentation values when connected.</span></div>
      </section>

      <div className="seo-bottom-grid"><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Review items</p><h2>SEO delivery checks</h2><p>Use these checks when setting the next delivery task.</p></div></div><div className="seo-next-list"><div><CheckCircle2 size={15} /><span>Review pages with increasing organic sessions.</span></div><div><CheckCircle2 size={15} /><span>Confirm source freshness before publishing a report.</span></div><div><CheckCircle2 size={15} /><span>Compare keyword movement with completed activities.</span></div></div></section><section className="card panel"><div className="panel-heading"><div><p className="eyebrow">Metric definitions</p><h2>Definitions and sources</h2><p>Each metric includes its source and reporting definition.</p></div></div><div className="definition-list">{metrics.map((metric) => <div key={metric.key}><strong>{metric.label}</strong><span>{metric.description}</span></div>)}</div></section></div>
    </div>
  </AppShell>;
}
