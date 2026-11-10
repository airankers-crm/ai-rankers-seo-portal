"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, Info, Search, SlidersHorizontal, Table2, TrendingUp } from "lucide-react";
import { comparisonOptions, DateRangePicker, type ComparisonOption, type DateRangeSelection } from "./date-range-picker";
import { AppShell } from "./app-shell";
import { PortalFeedback } from "./portal-feedback";

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
  { key: "ga4-channel-organic", label: "Organic search", value: 8426, color: "#16a085" },
  { key: "ga4-channel-direct", label: "Direct", value: 3210, color: "#2d6cdf" },
  { key: "ga4-channel-referral", label: "Referral", value: 1680, color: "#8557d6" },
  { key: "ga4-channel-email", label: "Email", value: 1145, color: "#f4b51d" },
  { key: "ga4-channel-paid-social", label: "Paid social", value: 968, color: "#ec6b9b" },
];

type WebsiteMetricKey = "organicTraffic" | "impressions" | "topTen";

const metricDefinitions: Array<{ key: WebsiteMetricKey; label: string; icon: typeof TrendingUp }> = [
  { key: "organicTraffic", label: "Organic sessions", icon: TrendingUp },
  { key: "impressions", label: "Search impressions", icon: Search },
  { key: "topTen", label: "Keywords in top 10", icon: BarChart3 },
];

function FilterDropdown({ label, value, displayValue = value, options, onChange }: { label: string; value: string; displayValue?: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: globalThis.MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className="website-seo-filter-dropdown" ref={dropdownRef}>
    <button type="button" className="website-seo-filter-select" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{displayValue}</span><ChevronDown size={11} /></button>
    {open ? <div className="website-seo-filter-menu" role="listbox" aria-label={label}>{options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className={option.value === value ? "active" : ""} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}</div> : null}
  </div>;
}

function initialRange(): DateRangeSelection {
  const now = new Date();
  return { label: "Last 6 months", start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: new Date(now.getFullYear(), now.getMonth(), now.getDate()), compare: "Previous period" };
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

function metricChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const trendChartFrame = { width: 700, height: 280, paddingX: 28, plotTop: 26, plotBottom: 238 };

function chartDomain(data: Array<{ value: number }>) {
  const values = data.map((point) => point.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = Math.max(dataMax - dataMin, 1);
  const breathingRoom = range * 0.12;
  return { min: dataMin - breathingRoom, max: dataMax + breathingRoom };
}

function chartY(value: number, data: Array<{ value: number }>) {
  const domain = chartDomain(data);
  return trendChartFrame.plotBottom - ((value - domain.min) / Math.max(domain.max - domain.min, 1)) * (trendChartFrame.plotBottom - trendChartFrame.plotTop);
}

function chartPath(data: Array<{ value: number }>) {
  if (data.length < 2) return "";
  return data.map((point, index) => {
    const x = trendChartFrame.paddingX + (index / (data.length - 1)) * (trendChartFrame.width - trendChartFrame.paddingX * 2);
    const y = chartY(point.value, data);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function renderChange(change: number | null) {
  if (change === null) return "No comparison";
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export function WebsiteSeoDashboard({ clientName, sectionName = "Website SEO", brandMark, brandAccent, metrics, rows, channels, isDraftPreview = false, isSectionPublished = true }: { clientName: string; sectionName?: string; brandMark: string; brandAccent: string; metrics: WebsiteSeoMetric[]; rows: WebsiteSeoRow[]; channels?: WebsiteSeoChannel[]; isDraftPreview?: boolean; isSectionPublished?: boolean }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
  const [activeMetricKey, setActiveMetricKey] = useState<WebsiteMetricKey>("organicTraffic");
  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.key, metric])), [metrics]);
  const acquisitionChannels = channels?.length ? channels : presentationChannels;
  const acquisitionTotal = acquisitionChannels.reduce((total, channel) => total + channel.value, 0);
  const topChannel = acquisitionChannels.reduce<WebsiteSeoChannel | undefined>((top, channel) => !top || channel.value > top.value ? channel : top, undefined);
  const activeChannel = acquisitionChannels.find((channel) => channel.key === (selectedChannel ?? topChannel?.key)) ?? topChannel;
  const channelIsPreview = !channels?.length;

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rangeStart = Date.UTC(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
    const rangeEnd = Date.UTC(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
    return rows.filter((row) => {
      const date = new Date(row.periodStart);
      const periodDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const inRange = periodDay >= rangeStart && periodDay <= rangeEnd;
      return inRange && (!normalizedQuery || row.periodLabel.toLowerCase().includes(normalizedQuery));
    });
  }, [dateRange.end, dateRange.start, query, rows]);

  const latestRow = visibleRows.at(-1);
  const previousRow = visibleRows.at(-2);
  const previousYearRow = latestRow ? (() => { const target = new Date(latestRow.periodStart); target.setUTCFullYear(target.getUTCFullYear() - 1); return rows.find((row) => row.periodStart.slice(0, 7) === target.toISOString().slice(0, 7)); })() : undefined;
  const comparisonRow = dateRange.compare === "Previous year" ? previousYearRow : previousRow;
  const hasPublishedData = rows.length > 0;
  const chartRows = visibleRows.filter((row) => row[activeMetricKey] !== null);
  const chartData = chartRows.map((row) => ({ label: row.periodLabel, value: row[activeMetricKey] as number }));
  const activeMetric = metricDefinitions.find((metric) => metric.key === activeMetricKey);
  const sourceLabels = [...new Set(metrics.map((metric) => metric.source))].join(", ");
  const comparisonAvailable = dateRange.compare !== "None" && Boolean(comparisonRow);
  const comparisonLabel = dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? dateRange.compare === "Previous year" ? "vs previous year" : "vs previous period" : "Comparison unavailable";
  const comparisonPeriodLabel = comparisonRow?.periodLabel ?? "the previous period";
  const insightComparison = dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? `${renderChange(metricChange(latestRow?.organicTraffic ?? null, comparisonRow?.organicTraffic ?? null))} vs ${dateRange.compare === "Previous year" ? "previous year" : comparisonPeriodLabel}` : "No comparison available for the selected range";

  const handleDonutMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (!acquisitionTotal || distance < bounds.width * 0.27) return;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    let offset = 0;
    const channel = acquisitionChannels.find((item) => {
      offset += (item.value / acquisitionTotal) * 360;
      return angle <= offset;
    });
    setHoveredChannel(channel?.key ?? null);
  };

  function resetFilters() {
    setDateRange(initialRange());
    setQuery("");
    setSelectedChannel(null);
    setHoveredChannel(null);
    setActiveMetricKey("organicTraffic");
  }

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Website SEO" hiddenNav={isSectionPublished ? [] : ["Website SEO"]} presentationMode>
    <div className="content website-seo-final" aria-label={`${sectionName} performance report`}>
      <div className="page-heading website-seo-final-heading">
        <div>
          <h1>Website SEO performance</h1>
          <p>{clientName} · Organic sessions, search visibility, and keyword growth.</p>
        </div>
        {isDraftPreview ? <div className="heading-actions"><span className="data-confidence data-confidence-preview"><CheckCircle2 size={13} /> Draft preview · not client-visible</span></div> : null}
      </div>

      <section className="website-seo-filter-bar" aria-label="Filter Website SEO report">
        <div className="website-seo-filter-title"><span><SlidersHorizontal size={15} /></span><strong>Filter report</strong></div>
        <div className="website-seo-filter-controls">
          <label><span>Date range</span><DateRangePicker value={dateRange} onApply={setDateRange} /></label>
          <label><span>Compare</span><FilterDropdown label="Compare" value={dateRange.compare} options={comparisonOptions.map((option) => ({ value: option, label: option }))} onChange={(value) => setDateRange((current) => ({ ...current, compare: value as ComparisonOption }))} /></label>
          <label><span>Channel focus</span><FilterDropdown label="Channel focus" value={selectedChannel ?? topChannel?.key ?? ""} displayValue={activeChannel?.label ?? "No channel"} options={acquisitionChannels.map((channel) => ({ value: channel.key, label: channel.label }))} onChange={setSelectedChannel} /></label>
          <label className="website-seo-search"><span className="sr-only">Search reporting periods</span><Search size={14} /><input aria-label="Search reporting periods" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reporting periods" /></label>
          <button className="button website-seo-reset" type="button" onClick={resetFilters}>Reset</button>
        </div>
      </section>

      {hasPublishedData ? <>
        <div className="website-seo-kpi-grid">
          {metricDefinitions.map((definition) => {
            const metric = metricMap.get(definition.key);
            const current = latestRow?.[definition.key] ?? null;
            const previous = comparisonRow?.[definition.key] ?? null;
            const change = comparisonAvailable ? metricChange(current, previous) : null;
            const Icon = definition.icon;
            return <article className="card website-seo-kpi" key={definition.key}><div className="website-seo-kpi-top"><span className="website-seo-kpi-label"><Icon size={16} /> {metric?.label ?? definition.label}</span><span className="website-seo-period-badge">Latest period</span><span className="source-badge">{metric?.source ?? "—"}</span></div><strong>{compactMetric(current, metric?.format ?? "INTEGER")}</strong><div className="website-seo-kpi-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {renderChange(change)}</span>{change !== null ? <span>{comparisonLabel}</span> : null}</div></article>;
          })}
        </div>

        <div className="website-seo-main-grid">
          <section className="card website-seo-chart-card" aria-labelledby="website-seo-chart-title"><div className="website-seo-card-heading"><h2 id="website-seo-chart-title">SEO performance over time</h2></div><div className="website-seo-chart-tabs" role="tablist" aria-label="Website SEO trend metrics">{metricDefinitions.map((definition) => <button key={definition.key} type="button" role="tab" aria-selected={activeMetricKey === definition.key} className={activeMetricKey === definition.key ? "active" : ""} onClick={() => setActiveMetricKey(definition.key)}>{definition.label}</button>)}</div>{chartData.length > 1 ? <div className="website-seo-chart-wrap" role="img" aria-label={`${activeMetric?.label ?? "SEO"} trend chart`}><svg viewBox={`0 0 ${trendChartFrame.width} ${trendChartFrame.height}`} preserveAspectRatio="none"><defs><linearGradient id="websiteSeoTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a085" stopOpacity=".25" /><stop offset="100%" stopColor="#16a085" stopOpacity=".02" /></linearGradient></defs>{[0, 1, 2, 3, 4].map((line) => { const y = trendChartFrame.plotTop + (line / 4) * (trendChartFrame.plotBottom - trendChartFrame.plotTop); return <line key={line} x1={trendChartFrame.paddingX} x2={trendChartFrame.width - trendChartFrame.paddingX} y1={y} y2={y} className="website-seo-grid-line" />; })}<path d={`${chartPath(chartData)} L${trendChartFrame.width - trendChartFrame.paddingX} ${trendChartFrame.plotBottom} L${trendChartFrame.paddingX} ${trendChartFrame.plotBottom} Z`} fill="url(#websiteSeoTrendFill)" /><path d={chartPath(chartData)} className="website-seo-chart-line" fill="none" />{chartData.map((point, index) => { const x = trendChartFrame.paddingX + (index / (chartData.length - 1)) * (trendChartFrame.width - trendChartFrame.paddingX * 2); const y = chartY(point.value, chartData); return <g key={point.label}><circle cx={x} cy={y} r="4.5" className="website-seo-chart-point" /><text x={x} y={trendChartFrame.height - 10} textAnchor="middle" className="website-seo-chart-label">{point.label}</text><text x={x} y={Math.max(y - 12, 14)} textAnchor="middle" className="website-seo-chart-value">{formatMetric(point.value, metricMap.get(activeMetricKey)?.format ?? "INTEGER")}</text></g>; })}</svg></div> : <div className="website-seo-chart-empty"><BarChart3 size={16} /><span>Publish at least two periods to show SEO movement.</span></div>}</section>

          <aside className="card website-seo-insights" aria-labelledby="website-seo-insights-title"><div className="website-seo-card-heading"><h2 id="website-seo-insights-title">Key insights</h2></div><p><CheckCircle2 size={15} /> Organic sessions {insightComparison}.</p><p><CheckCircle2 size={15} /> Search impressions {dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? `${renderChange(metricChange(latestRow?.impressions ?? null, comparisonRow?.impressions ?? null))} vs ${dateRange.compare === "Previous year" ? "previous year" : comparisonPeriodLabel}` : "No comparison available for the selected range"}.</p><p><CheckCircle2 size={15} /> {latestRow?.topTen === null || latestRow?.topTen === undefined ? "Keyword ranking data is unavailable." : `${latestRow.topTen.toLocaleString()} keywords now rank in the top 10.`}</p><div className="website-seo-insight-source">Sources: {sourceLabels || "Published SEO metrics"}.</div></aside>
        </div>

        <div className="website-seo-lower-grid"><section className="card website-seo-results-card" aria-labelledby="website-seo-results-title"><div className="website-seo-card-heading"><div><h2 id="website-seo-results-title">Results by month</h2><p>Latest six-month reporting window</p></div><Table2 size={18} color="#148f83" /></div><div className="website-seo-table-wrap"><table className="website-seo-table"><thead><tr><th>Month</th><th>Organic sessions</th><th>Search impressions</th><th>Top-10 keywords</th></tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.periodStart} className={index === visibleRows.length - 1 ? "is-latest" : undefined}><td><strong>{row.periodLabel}</strong><span>{index === visibleRows.length - 1 ? "Latest period" : "Historical period"}</span></td><td>{formatMetric(row.organicTraffic, metricMap.get("organicTraffic")?.format ?? "INTEGER")}</td><td>{formatMetric(row.impressions, metricMap.get("impressions")?.format ?? "INTEGER")}</td><td>{formatMetric(row.topTen, metricMap.get("topTen")?.format ?? "RANK")}</td></tr>)}</tbody></table></div><div className="website-seo-table-foot"><span><TrendingUp size={13} /> Ranking values are point-in-time counts and are not summed.</span><span>{visibleRows.length} periods · {dateRange.label}</span></div></section>

          <section className="card website-seo-acquisition-card" aria-labelledby="website-seo-acquisition-title"><div className="website-seo-card-heading"><h2 id="website-seo-acquisition-title">Acquisition channels</h2><span className="source-badge pending">{channelIsPreview ? "GA4 preview" : "GA4"}</span></div><div className="website-seo-acquisition-layout"><div className="website-seo-donut-wrap"><div className="website-seo-donut" style={{ background: `conic-gradient(${acquisitionChannels.reduce<{ stops: string[]; offset: number }>((result, channel) => { const start = result.offset; const end = start + (channel.value / acquisitionTotal) * 100; result.stops.push(`${channel.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`); result.offset = end; return result; }, { stops: [], offset: 0 }).stops.join(", ")})` }} onMouseMove={handleDonutMove} onMouseLeave={() => setHoveredChannel(null)} role="img" aria-label={`${acquisitionTotal.toLocaleString()} ${channelIsPreview ? "preview " : ""}sessions by acquisition channel`}><div className="website-seo-donut-center"><strong>{(hoveredChannel ? acquisitionChannels.find((channel) => channel.key === hoveredChannel)?.value : acquisitionTotal)?.toLocaleString()}</strong><span>{hoveredChannel ? acquisitionChannels.find((channel) => channel.key === hoveredChannel)?.label : channelIsPreview ? "Preview sessions" : "Sessions"}</span></div></div></div><div className="website-seo-channel-list">{acquisitionChannels.map((channel) => { const share = acquisitionTotal ? (channel.value / acquisitionTotal) * 100 : 0; const active = (hoveredChannel ?? selectedChannel ?? activeChannel?.key) === channel.key; return <button type="button" className={`website-seo-channel-row${active ? " active" : ""}`} key={channel.key} onClick={() => setSelectedChannel(channel.key)} onMouseEnter={() => setHoveredChannel(channel.key)} onMouseLeave={() => setHoveredChannel(null)} aria-pressed={active}><span className="website-seo-channel-swatch" style={{ backgroundColor: channel.color }} /><strong>{channel.label}</strong><span>{share.toFixed(1)}%</span></button>; })}</div></div><p className="website-seo-acquisition-note"><Info size={13} /> {channelIsPreview ? "Presentation mix shown until GA4 channel attribution is connected." : "GA4 channel attribution is connected."}</p></section></div>

        <section className="card website-seo-definitions"><h2>Definitions and sources</h2><div><p><strong>Organic sessions:</strong> Website visits from unpaid search results. <span>GA4</span></p><p><strong>Search impressions:</strong> How often the site appeared in Google Search results. <span>Google Search Console</span></p><p><strong>Keywords in top 10:</strong> Tracked keywords ranking in positions 1–10. <span>DataForSEO</span></p></div></section>
      </> : <section className="card website-seo-empty"><BarChart3 size={20} /><div><h2>No Website SEO data published yet.</h2><p>Publish at least one reporting period to show the client-facing SEO report.</p></div></section>}

      <PortalFeedback pagePath="/portal/website-seo" pageLabel="Website SEO" context={{ dateRange: dateRange.label, selectedChannel: activeChannel?.label ?? null, search: query || null }} />
    </div>
  </AppShell>;
}
